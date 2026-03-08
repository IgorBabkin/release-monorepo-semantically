import path from 'node:path';
import { z } from 'zod';
import { CliOptions, TemplateOverrides } from '../models/CliOptions';
import { DEFAULT_CHANGELOG_TEMPLATE } from './ChangelogView';
import { NodeFileSystemService } from './NodeFileSystemService';
import { DEFAULT_RELEASE_COMMIT_TEMPLATE } from './ReleaseCommitView';
import { InvalidReleasePluginsConfigException } from '../exceptions/DomainException';
import { DEFAULT_RELEASE_PLUGINS, RELEASE_PLUGIN_NAMES, ReleasePluginConfig } from '../models/ReleasePluginConfig';

const pluginSchema = z
  .object({
    name: z.enum(RELEASE_PLUGIN_NAMES),
    disabled: z.boolean().optional(),
    template: z.string().trim().min(1).optional(),
    changelogName: z.string().trim().min(1).optional(),
  })
  .passthrough();
const pluginsSchema = z
  .array(pluginSchema)
  .min(1)
  .superRefine((plugins, context) => {
    for (const [index, plugin] of plugins.entries()) {
      if ((plugin.name === 'changelog' || plugin.name === 'git' || plugin.name === 'github') && !plugin.template) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: [index, 'template'],
          message: `Plugin "${plugin.name}" requires a template`,
        });
      }
    }
  });

interface TemplateOverridesConfig {
  releaseTemplates?: TemplateOverrides;
  changelogTemplate?: string;
  releaseCommitTemplate?: string;
  plugins?: unknown;
}

interface PackageJsonWithTemplates {
  releaseTemplates?: TemplateOverrides;
  release?: TemplateOverridesConfig;
  'monorepo-semantic-release'?: TemplateOverridesConfig;
  plugins?: unknown;
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

  resolvePlugins(cwd: string): ReleasePluginConfig[] {
    const packagePlugins = this.readPluginsFromPackageJson(cwd);
    const filePlugins = this.readPluginsFromConfigFile(cwd);

    return filePlugins ?? packagePlugins ?? [...DEFAULT_RELEASE_PLUGINS];
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

  private readPluginsFromPackageJson(cwd: string): ReleasePluginConfig[] | undefined {
    const packageJson = this.fsService.readJson<PackageJsonWithTemplates>(path.resolve(cwd, 'package.json'));
    const legacyPlugins = this.normalizePlugins(packageJson, 'package.json');
    const releaseSectionPlugins = this.normalizePlugins(packageJson.release, 'package.json');
    const monorepoSectionPlugins = this.normalizePlugins(packageJson['monorepo-semantic-release'], 'package.json');

    return monorepoSectionPlugins ?? releaseSectionPlugins ?? legacyPlugins;
  }

  private readPluginsFromConfigFile(cwd: string): ReleasePluginConfig[] | undefined {
    const configPath = path.resolve(cwd, CONFIG_FILE_NAME);
    if (!this.fsService.fileExists(configPath)) {
      return undefined;
    }

    return this.normalizePlugins(this.fsService.readJson<TemplateOverridesConfig>(configPath), CONFIG_FILE_NAME);
  }

  private normalizePlugins(config: TemplateOverridesConfig | undefined, source: string): ReleasePluginConfig[] | undefined {
    if (!config) {
      return undefined;
    }

    const configuredPlugins = config.plugins;
    if (!configuredPlugins) {
      return undefined;
    }

    const parsedPlugins = pluginsSchema.safeParse(configuredPlugins);
    if (!parsedPlugins.success) {
      throw new InvalidReleasePluginsConfigException(
        `"${source}" plugins must be an array of objects with required "name", optional "disabled", and required "template" for changelog/git/github`,
      );
    }

    const normalizedPlugins = parsedPlugins.data;
    const pluginNames = normalizedPlugins.map((plugin) => plugin.name);

    const duplicates = pluginNames.filter((plugin, index) => pluginNames.indexOf(plugin) !== index);
    if (duplicates.length > 0) {
      throw new InvalidReleasePluginsConfigException(`"${source}" contains duplicate plugin ids: ${[...new Set(duplicates)].join(', ')}`);
    }

    return normalizedPlugins as ReleasePluginConfig[];
  }
}
