import { bindTo, inject, register } from 'ts-ioc-container';
import { IFileSystemService, IFileSystemServiceKey } from '../../services/NodeFileSystemService.js';
import { ILogger, ILoggerKey } from '../../services/ConsoleLogger.js';
import { z } from 'zod';
import { pluginsConfigService } from '../../services/PluginsConfigService.js';
import { CONFIG_KEY, PLUGIN_CONFIG_SCHEMA } from './PackageJsonConfig.js';
import { action, command, execute, onDefault, schema } from '../../cli/index.js';
import { constant as c } from '../../utils/utils.js';
import { deserializeContext } from '../../domain/ReleaseControllerContext.js';
import { isDryRun, STEP_OPTIONS, stepCommand, type StepOptions } from '../../utils/cli.js';
import { PackageManager, PackageManagerKey } from '../packageManager/services/PackageManager.js';
import { globalConfig } from '../../domain/GlobalConfig.js';

@register(bindTo('package-json'))
export class PackageController {
  constructor(
    @inject(pluginsConfigService(CONFIG_KEY, PLUGIN_CONFIG_SCHEMA)) private readonly config: z.infer<typeof PLUGIN_CONFIG_SCHEMA>,
    @inject(IFileSystemServiceKey) private readonly fs: IFileSystemService,
    @inject(PackageManagerKey) private readonly packageManager: PackageManager,
    @inject(globalConfig('cwd')) private readonly cwd: string,
    @inject(ILoggerKey.args('package-json')) private readonly logger: ILogger,
  ) {}

  @onDefault(execute())
  @command(c(stepCommand()))
  @schema(c(STEP_OPTIONS))
  @action('update-dependencies', execute())
  updateDependencies(options: StepOptions): void {
    const { releasedPackages, releasedVersions } = deserializeContext(options.context);
    const dryRun = isDryRun(options, this.config);
    let manifestsChanged = false;

    for (const pkg of releasedPackages) {
      const changes = pkg.getDependencyUpdates(releasedVersions);
      if (changes.length === 0) {
        continue;
      }

      const packageJson = this.fs.readPackageJsonOrFail(pkg.dirname);

      for (const change of changes) {
        // The bump goes back into the blocks the outdated version was read
        // from, and nowhere else. Writing it to `dependencies` unconditionally
        // left the devDependency it came from stale and handed consumers a
        // duplicate copy of a package they already had as a peer.
        for (const section of change.sections) {
          const declaredDependencies = packageJson[section];
          if (declaredDependencies?.[change.packageName] === undefined) {
            continue;
          }
          declaredDependencies[change.packageName] = change.newVersion;
        }
        this.logger.info(`BUMP     ${change.packageName}@${change.newVersion}`);
      }

      if (dryRun) {
        this.logger.info(`SKIP     SAVE     ${pkg.name} package.json (dry-run)`);
        continue;
      }

      this.fs.writeToPackageJsonOrFail(pkg.dirname, packageJson);
      manifestsChanged = true;
      this.logger.info(`SAVE     ${pkg.name} package.json`);
    }

    if (manifestsChanged) {
      this.refreshLockfile();
    }
  }

  /**
   * Rewriting a manifest changes a specifier the lockfile has recorded, so an
   * unrefreshed lockfile fails every later `install --frozen-lockfile` — not
   * just the release build. The refresh belongs to this step so the release
   * commit carries both halves of the change.
   */
  private refreshLockfile(): void {
    const { lockfileName } = this.packageManager;
    if (!this.fs.fileExists(lockfileName)) {
      return;
    }

    this.packageManager.refreshLockfile(this.cwd);
    this.logger.info(`LOCK     ${lockfileName} refreshed`);
  }
}
