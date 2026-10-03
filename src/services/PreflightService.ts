import { inject, register, SingleToken } from 'ts-ioc-container';
import { PackageJSON } from '../domain/PackageJSON.js';
import { MissingPublicAccessException, PreflightValidationException } from '../exceptions/DomainException.js';
import { CONFIG_KEY as CHANGELOG_CONFIG_KEY, PLUGIN_CONFIG_SCHEMA as CHANGELOG_CONFIG_SCHEMA } from '../features/changelog/ChangelogConfig.js';
import { CONFIG_KEY as PACKAGE_JSON_CONFIG_KEY, PLUGIN_CONFIG_SCHEMA as PACKAGE_JSON_CONFIG_SCHEMA } from '../features/packageJson/PackageJsonConfig.js';
import {
  CONFIG_KEY as PACKAGE_MANAGER_CONFIG_KEY,
  PLUGIN_CONFIG_SCHEMA as PACKAGE_MANAGER_CONFIG_SCHEMA,
} from '../features/packageManager/PackageManagerConfig.js';
import { CONFIG_KEY as REPORT_CONFIG_KEY, PLUGIN_CONFIG_SCHEMA as REPORT_CONFIG_SCHEMA } from '../features/report/ReportConfig.js';
import { CONFIG_KEY as RELEASE_NOTES_CONFIG_KEY, PLUGIN_CONFIG_SCHEMA as RELEASE_NOTES_CONFIG_SCHEMA } from '../features/releaseNotes/ReleaseNotesConfig.js';
import { ReleaseNotesServiceKey } from '../features/releaseNotes/services/ReleaseNotesService.js';
import { CONFIG_KEY as VCS_CONFIG_KEY, PLUGIN_CONFIG_SCHEMA as VCS_CONFIG_SCHEMA } from '../features/vcs/VCSConfig.js';
import { IFileSystemService, IFileSystemServiceKey } from './NodeFileSystemService.js';
import { IPluginsConfigService, IPluginsConfigServiceKey } from './PluginsConfigService.js';
import type { ZodType } from 'zod';

export const PreflightServiceKey = new SingleToken<PreflightService>('PreflightService');

@register(PreflightServiceKey)
export class PreflightService {
  constructor(
    @inject(IFileSystemServiceKey) private readonly fs: IFileSystemService,
    @inject(IPluginsConfigServiceKey) private readonly configService: IPluginsConfigService,
    @inject(ReleaseNotesServiceKey) private readonly releaseNotesService: { isCliAvailable(): boolean },
  ) {}

  validate(): string[] {
    const problems: string[] = [];
    let packages: [string, PackageJSON][] = [];

    this.readConfig(problems, REPORT_CONFIG_KEY, REPORT_CONFIG_SCHEMA);
    this.readConfig(problems, PACKAGE_JSON_CONFIG_KEY, PACKAGE_JSON_CONFIG_SCHEMA);
    this.readConfig(problems, PACKAGE_MANAGER_CONFIG_KEY, PACKAGE_MANAGER_CONFIG_SCHEMA);

    try {
      const { workspaces } = this.fs.readRootPackageJsonOrFail();
      packages = this.fs.findManyPackageJsonByGlob(workspaces);
      if (packages.length === 0) {
        problems.push('No package.json files matched root package.json#workspaces; add valid package globs (this tool does not read pnpm-workspace.yaml)');
      }
    } catch (error) {
      problems.push(error instanceof Error ? error.message : String(error));
    }

    for (const [, pkg] of packages) {
      if (!pkg.private && pkg.name.startsWith('@') && (pkg as PackageJSON & { publishConfig?: { access?: string } }).publishConfig?.access !== 'public') {
        problems.push(new MissingPublicAccessException(pkg.name).message);
      }
    }

    this.validateTemplate(problems, 'vcs', VCS_CONFIG_KEY, VCS_CONFIG_SCHEMA);
    this.validateTemplate(problems, 'changelog', CHANGELOG_CONFIG_KEY, CHANGELOG_CONFIG_SCHEMA);
    const releaseNotesConfig = this.validateTemplate(problems, 'release-notes', RELEASE_NOTES_CONFIG_KEY, RELEASE_NOTES_CONFIG_SCHEMA);

    if (problems.length > 0) {
      throw new PreflightValidationException(problems);
    }

    const hasRepository = releaseNotesConfig.repository ?? process.env.GITHUB_REPOSITORY;
    const hasToken = releaseNotesConfig.token ?? process.env.GITHUB_TOKEN;
    const warnings: string[] = [];
    if (!hasRepository || !hasToken) {
      warnings.push(
        'GitHub release notes are optional; before running release-notes, set release.release-notes.repository/token or GITHUB_REPOSITORY/GITHUB_TOKEN',
      );
    }
    if (!this.releaseNotesService.isCliAvailable()) {
      warnings.push('GitHub release notes are optional; install the GitHub CLI (gh) before running release-notes');
    }
    return warnings;
  }

  private validateTemplate<T extends ZodType>(problems: string[], step: string, key: string, schema: T): { template?: string } & Record<string, unknown> {
    const config = this.readConfig(problems, key, schema) as ({ template?: string } & Record<string, unknown>) | undefined;
    if (config?.template && !this.fs.fileExists(config.template)) {
      problems.push(`Configured ${step} template "${config.template}" does not exist; correct release.${step}.template or create the file`);
    }
    return config ?? {};
  }

  private readConfig<T extends ZodType>(problems: string[], key: string, schema: T): unknown {
    try {
      return this.configService.getConfig(key, schema);
    } catch (error) {
      problems.push(error instanceof Error ? error.message : String(error));
      return undefined;
    }
  }
}
