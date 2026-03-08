import path from 'node:path';
import { CliOptions, TemplateOverrides } from '../models/CliOptions';
import { DEFAULT_CHANGELOG_TEMPLATE } from './ChangelogView';
import { NodeFileSystemService } from './NodeFileSystemService';
import { DEFAULT_RELEASE_COMMIT_TEMPLATE } from './ReleaseCommitView';
import { InvalidReleasePluginsConfigException } from '../exceptions/DomainException';

export const DEFAULT_RELEASE_PLUGIN_ORDER = ['package-json', 'changelog', 'git', 'github', 'npm'] as const;
export type ReleasePluginName = (typeof DEFAULT_RELEASE_PLUGIN_ORDER)[number];

const RELEASE_PLUGIN_NAME_SET = new Set<ReleasePluginName>(DEFAULT_RELEASE_PLUGIN_ORDER);

interface TemplateOverridesConfig {
  releaseTemplates?: TemplateOverrides;
  changelogTemplate?: string;
  releaseCommitTemplate?: string;
  plugins?: string[];
}

interface PackageJsonWithTemplates {
  releaseTemplates?: TemplateOverrides;
  release?: TemplateOverridesConfig;
  'monorepo-semantic-release'?: TemplateOverridesConfig;
  plugins?: string[];
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

  resolvePluginOrder(cwd: string): ReleasePluginName[] {
    const packagePlugins = this.readPluginOrderFromPackageJson(cwd);
    const filePlugins = this.readPluginOrderFromConfigFile(cwd);

    return filePlugins ?? packagePlugins ?? [...DEFAULT_RELEASE_PLUGIN_ORDER];
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

  private readPluginOrderFromPackageJson(cwd: string): ReleasePluginName[] | undefined {
    const packageJson = this.fsService.readJson<PackageJsonWithTemplates>(path.resolve(cwd, 'package.json'));
    const legacyPlugins = this.normalizePluginOrder(packageJson, 'package.json');
    const releaseSectionPlugins = this.normalizePluginOrder(packageJson.release, 'package.json');
    const monorepoSectionPlugins = this.normalizePluginOrder(packageJson['monorepo-semantic-release'], 'package.json');

    return monorepoSectionPlugins ?? releaseSectionPlugins ?? legacyPlugins;
  }

  private readPluginOrderFromConfigFile(cwd: string): ReleasePluginName[] | undefined {
    const configPath = path.resolve(cwd, CONFIG_FILE_NAME);
    if (!this.fsService.fileExists(configPath)) {
      return undefined;
    }

    return this.normalizePluginOrder(this.fsService.readJson<TemplateOverridesConfig>(configPath), CONFIG_FILE_NAME);
  }

  private normalizePluginOrder(config: TemplateOverridesConfig | undefined, source: string): ReleasePluginName[] | undefined {
    if (!config) {
      return undefined;
    }

    const configuredPlugins = config.plugins;
    if (!configuredPlugins) {
      return undefined;
    }

    if (configuredPlugins.length === 0) {
      throw new InvalidReleasePluginsConfigException(`"${source}" must declare at least one plugin when plugins is configured`);
    }

    const normalizedPlugins = configuredPlugins.map((plugin) => plugin.trim().toLowerCase());
    const invalidPlugins = normalizedPlugins.filter((plugin): plugin is string => !RELEASE_PLUGIN_NAME_SET.has(plugin as ReleasePluginName));
    if (invalidPlugins.length > 0) {
      throw new InvalidReleasePluginsConfigException(`"${source}" contains unknown plugin ids: ${[...new Set(invalidPlugins)].join(', ')}`);
    }

    const duplicates = normalizedPlugins.filter((plugin, index) => normalizedPlugins.indexOf(plugin) !== index);
    if (duplicates.length > 0) {
      throw new InvalidReleasePluginsConfigException(`"${source}" contains duplicate plugin ids: ${[...new Set(duplicates)].join(', ')}`);
    }

    return normalizedPlugins as ReleasePluginName[];
  }
}
