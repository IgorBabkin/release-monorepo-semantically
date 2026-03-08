import { describe, expect, it, vi } from 'vitest';
import { ReleaseConfigService } from './ReleaseConfigService';
import { DEFAULT_CHANGELOG_TEMPLATE } from './ChangelogView';
import { DEFAULT_RELEASE_COMMIT_TEMPLATE } from './ReleaseCommitView';
import { InvalidReleasePluginsConfigException } from '../exceptions/DomainException';
import { DEFAULT_RELEASE_PLUGIN_ORDER } from './ReleaseConfigService';

describe('ReleaseConfigService', () => {
  it('given cli options when template overrides are resolved then cli values have highest priority', () => {
    const fsService = {
      readJson: vi.fn((filePath: string) => {
        if (filePath.endsWith('package.json')) {
          return {
            releaseTemplates: {
              changelogTemplate: 'templates/changelog-from-package.hbs',
              releaseCommitTemplate: 'templates/release-from-package.hbs',
            },
          };
        }

        return {
          releaseTemplates: {
            changelogTemplate: 'templates/changelog-from-file.hbs',
            releaseCommitTemplate: 'templates/release-from-file.hbs',
          },
        };
      }),
      fileExists: vi.fn().mockReturnValue(true),
    };
    const service = new ReleaseConfigService(fsService as never);

    const resolved = service.resolveTemplateOverrides('/repo', {
      help: false,
      dryRun: false,
      noPush: false,
      noPublish: false,
      changelogTemplate: 'templates/changelog-from-cli.hbs',
      releaseCommitTemplate: 'templates/release-from-cli.hbs',
    });

    expect(resolved).toEqual({
      changelogTemplate: 'templates/changelog-from-cli.hbs',
      releaseCommitTemplate: 'templates/release-from-cli.hbs',
    });
  });

  it('given file and package config when template overrides are resolved then .semantic-release.json overrides package.json', () => {
    const fsService = {
      readJson: vi.fn((filePath: string) => {
        if (filePath.endsWith('package.json')) {
          return {
            releaseTemplates: {
              changelogTemplate: 'templates/changelog-from-package.hbs',
              releaseCommitTemplate: 'templates/release-from-package.hbs',
            },
          };
        }

        return {
          releaseTemplates: {
            changelogTemplate: 'templates/changelog-from-file.hbs',
            releaseCommitTemplate: 'templates/release-from-file.hbs',
          },
        };
      }),
      fileExists: vi.fn().mockReturnValue(true),
    };
    const service = new ReleaseConfigService(fsService as never);

    const resolved = service.resolveTemplateOverrides('/repo', {
      help: false,
      dryRun: false,
      noPush: false,
      noPublish: false,
      changelogTemplate: undefined,
      releaseCommitTemplate: undefined,
    });

    expect(resolved).toEqual({
      changelogTemplate: 'templates/changelog-from-file.hbs',
      releaseCommitTemplate: 'templates/release-from-file.hbs',
    });
  });

  it('given no config file and package release section when template overrides are resolved then package section is used before legacy field', () => {
    const fsService = {
      readJson: vi.fn().mockReturnValue({
        releaseTemplates: {
          changelogTemplate: 'templates/changelog-from-legacy.hbs',
          releaseCommitTemplate: 'templates/release-from-legacy.hbs',
        },
        release: {
          releaseTemplates: {
            changelogTemplate: 'templates/changelog-from-release-section.hbs',
            releaseCommitTemplate: 'templates/release-from-release-section.hbs',
          },
        },
      }),
      fileExists: vi.fn().mockReturnValue(false),
    };
    const service = new ReleaseConfigService(fsService as never);

    const resolved = service.resolveTemplateOverrides('/repo', {
      help: false,
      dryRun: false,
      noPush: false,
      noPublish: false,
      changelogTemplate: undefined,
      releaseCommitTemplate: undefined,
    });

    expect(resolved).toEqual({
      changelogTemplate: 'templates/changelog-from-release-section.hbs',
      releaseCommitTemplate: 'templates/release-from-release-section.hbs',
    });
  });

  it('given no configured template overrides when template overrides are resolved then defaults are returned', () => {
    const fsService = {
      readJson: vi.fn().mockReturnValue({}),
      fileExists: vi.fn().mockReturnValue(false),
    };
    const service = new ReleaseConfigService(fsService as never);

    const resolved = service.resolveTemplateOverrides('/repo', {
      help: false,
      dryRun: false,
      noPush: false,
      noPublish: false,
      changelogTemplate: undefined,
      releaseCommitTemplate: undefined,
    });

    expect(resolved).toEqual({
      changelogTemplate: DEFAULT_CHANGELOG_TEMPLATE,
      releaseCommitTemplate: DEFAULT_RELEASE_COMMIT_TEMPLATE,
    });
  });

  it('given package config with release plugin order when plugin order is resolved then configured order is returned', () => {
    const fsService = {
      readJson: vi.fn().mockReturnValue({
        release: {
          plugins: ['package-json', 'changelog', 'npm', 'git'],
        },
      }),
      fileExists: vi.fn().mockReturnValue(false),
    };
    const service = new ReleaseConfigService(fsService as never);

    expect(service.resolvePluginOrder('/repo')).toEqual(['package-json', 'changelog', 'npm', 'git']);
  });

  it('given both config file and package plugin order when plugin order is resolved then file config has precedence', () => {
    const fsService = {
      readJson: vi.fn((filePath: string) => {
        if (filePath.endsWith('package.json')) {
          return {
            plugins: ['package-json', 'changelog', 'git'],
          };
        }

        return {
          plugins: ['package-json', 'changelog', 'npm', 'git'],
        };
      }),
      fileExists: vi.fn().mockReturnValue(true),
    };
    const service = new ReleaseConfigService(fsService as never);

    expect(service.resolvePluginOrder('/repo')).toEqual(['package-json', 'changelog', 'npm', 'git']);
  });

  it('given no configured plugin order when plugin order is resolved then defaults are returned', () => {
    const fsService = {
      readJson: vi.fn().mockReturnValue({}),
      fileExists: vi.fn().mockReturnValue(false),
    };
    const service = new ReleaseConfigService(fsService as never);

    expect(service.resolvePluginOrder('/repo')).toEqual(DEFAULT_RELEASE_PLUGIN_ORDER);
  });

  it('given invalid release plugin id when plugin order is resolved then a config exception is raised', () => {
    const fsService = {
      readJson: vi.fn().mockReturnValue({
        plugins: ['package-json', 'unknown-plugin'],
      }),
      fileExists: vi.fn().mockReturnValue(false),
    };
    const service = new ReleaseConfigService(fsService as never);

    expect(() => service.resolvePluginOrder('/repo')).toThrow(InvalidReleasePluginsConfigException);
  });
});
