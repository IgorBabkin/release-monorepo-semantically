import path from 'node:path';
import { CliOptions, TemplateOverrides } from '../CliOptions';
import { DEFAULT_CHANGELOG_TEMPLATE } from './ChangelogView';
import { NodeFileSystemService } from './NodeFileSystemService';
import { DEFAULT_RELEASE_COMMIT_TEMPLATE } from './ReleaseCommitView';

interface TemplateOverridesConfig {
  releaseTemplates?: TemplateOverrides;
  changelogTemplate?: string;
  releaseCommitTemplate?: string;
}

interface PackageJsonWithTemplates {
  releaseTemplates?: TemplateOverrides;
  release?: TemplateOverridesConfig;
  'monorepo-semantic-release'?: TemplateOverridesConfig;
}

type ResolvedTemplateOverrides = Required<TemplateOverrides>;

const CONFIG_FILE_NAME = '.semantic-release.json';

export class ReleaseConfigService {
  constructor(private readonly fsService: NodeFileSystemService) {}

  resolveTemplateOverrides(cwd: string, cliOptions: CliOptions): ResolvedTemplateOverrides {
    const packageTemplates = this.readTemplateOverridesFromPackageJson(cwd);
    const fileTemplates = this.readTemplateOverridesFromConfigFile(cwd);

    return {
      releaseCommitTemplate:
        cliOptions.releaseCommitTemplate ?? fileTemplates.releaseCommitTemplate ?? packageTemplates.releaseCommitTemplate ?? DEFAULT_RELEASE_COMMIT_TEMPLATE,
      changelogTemplate: cliOptions.changelogTemplate ?? fileTemplates.changelogTemplate ?? packageTemplates.changelogTemplate ?? DEFAULT_CHANGELOG_TEMPLATE,
    };
  }

  private readTemplateOverridesFromPackageJson(cwd: string): TemplateOverrides {
    const packageJson = this.fsService.readJson<PackageJsonWithTemplates>(path.resolve(cwd, 'package.json'));
    const legacyTemplates = packageJson.releaseTemplates ?? {};
    const releaseSectionTemplates = this.normalizeTemplateOverrides(packageJson.release);
    const monorepoSectionTemplates = this.normalizeTemplateOverrides(packageJson['monorepo-semantic-release']);

    return {
      releaseCommitTemplate:
        monorepoSectionTemplates.releaseCommitTemplate ?? releaseSectionTemplates.releaseCommitTemplate ?? legacyTemplates.releaseCommitTemplate,
      changelogTemplate: monorepoSectionTemplates.changelogTemplate ?? releaseSectionTemplates.changelogTemplate ?? legacyTemplates.changelogTemplate,
    };
  }

  private readTemplateOverridesFromConfigFile(cwd: string): TemplateOverrides {
    const configPath = path.resolve(cwd, CONFIG_FILE_NAME);
    if (!this.fsService.fileExists(configPath)) {
      return {};
    }

    return this.normalizeTemplateOverrides(this.fsService.readJson<TemplateOverridesConfig>(configPath));
  }

  private normalizeTemplateOverrides(config: TemplateOverridesConfig | undefined): TemplateOverrides {
    if (!config) {
      return {};
    }

    return {
      releaseCommitTemplate: config.releaseCommitTemplate ?? config.releaseTemplates?.releaseCommitTemplate,
      changelogTemplate: config.changelogTemplate ?? config.releaseTemplates?.changelogTemplate,
    };
  }
}
