import { describe, expect, it, vi } from 'vitest';
import { ReleaseConfigService } from './ReleaseConfigService';
import { DEFAULT_CHANGELOG_TEMPLATE } from './ChangelogView';
import { DEFAULT_RELEASE_COMMIT_TEMPLATE } from './ReleaseCommitView';
import { InvalidReleasePluginsConfigException } from '../exceptions/DomainException';
import { DEFAULT_RELEASE_PLUGINS } from '../models/ReleasePluginConfig';

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

  it('given package config with plugins when plugins are resolved then configured plugin objects are returned', () => {
    const fsService = {
      readJson: vi.fn().mockReturnValue({
        release: {
          plugins: [
            { name: 'package-json' },
            { name: 'changelog', template: 'templates/custom-changelog.hbs' },
            { name: 'git', template: 'templates/custom-release.hbs' },
            { name: 'npm', disabled: true },
          ],
        },
      }),
      fileExists: vi.fn().mockReturnValue(false),
    };
    const service = new ReleaseConfigService(fsService as never);

    expect(service.resolvePlugins('/repo')).toEqual([
      { name: 'package-json' },
      { name: 'changelog', template: 'templates/custom-changelog.hbs' },
      { name: 'git', template: 'templates/custom-release.hbs' },
      { name: 'npm', disabled: true },
    ]);
  });

  it('given both config file and package plugins when plugins are resolved then file config has precedence', () => {
    const fsService = {
      readJson: vi.fn((filePath: string) => {
        if (filePath.endsWith('package.json')) {
          return {
            plugins: [{ name: 'package-json' }, { name: 'git', template: 'templates/from-package.hbs' }],
          };
        }

        return {
          plugins: [{ name: 'package-json' }, { name: 'git', template: 'templates/from-file.hbs' }],
        };
      }),
      fileExists: vi.fn().mockReturnValue(true),
    };
    const service = new ReleaseConfigService(fsService as never);

    expect(service.resolvePlugins('/repo')).toEqual([{ name: 'package-json' }, { name: 'git', template: 'templates/from-file.hbs' }]);
  });

  it('given no configured plugins when plugins are resolved then defaults are returned', () => {
    const fsService = {
      readJson: vi.fn().mockReturnValue({}),
      fileExists: vi.fn().mockReturnValue(false),
    };
    const service = new ReleaseConfigService(fsService as never);

    expect(service.resolvePlugins('/repo')).toEqual(DEFAULT_RELEASE_PLUGINS);
  });

  it('given string plugin entries when plugins are resolved then a config exception is raised', () => {
    const fsService = {
      readJson: vi.fn().mockReturnValue({
        plugins: ['package-json'],
      }),
      fileExists: vi.fn().mockReturnValue(false),
    };
    const service = new ReleaseConfigService(fsService as never);

    expect(() => service.resolvePlugins('/repo')).toThrow(InvalidReleasePluginsConfigException);
  });

  it('given changelog, git, or github plugin without template when plugins are resolved then a config exception is raised', () => {
    const fsService = {
      readJson: vi.fn().mockReturnValue({
        plugins: [{ name: 'changelog' }, { name: 'git' }, { name: 'github' }],
      }),
      fileExists: vi.fn().mockReturnValue(false),
    };
    const service = new ReleaseConfigService(fsService as never);

    expect(() => service.resolvePlugins('/repo')).toThrow(InvalidReleasePluginsConfigException);
  });
});
