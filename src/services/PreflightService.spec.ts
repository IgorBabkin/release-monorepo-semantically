import { describe, expect, it } from 'vitest';
import { It, Mock } from 'moq.ts';
import { IFileSystemService } from './NodeFileSystemService.js';
import { IPluginsConfigService } from './PluginsConfigService.js';
import { ReleaseNotesService } from '../features/releaseNotes/services/ReleaseNotesService.js';
import { PreflightService } from './PreflightService.js';
import { PLUGIN_CONFIG_SCHEMA as VCS_CONFIG_SCHEMA } from '../features/vcs/VCSConfig.js';
import { PLUGIN_CONFIG_SCHEMA as CHANGELOG_CONFIG_SCHEMA } from '../features/changelog/ChangelogConfig.js';
import { PLUGIN_CONFIG_SCHEMA as RELEASE_NOTES_CONFIG_SCHEMA } from '../features/releaseNotes/ReleaseNotesConfig.js';
import { PLUGIN_CONFIG_SCHEMA as REPORT_CONFIG_SCHEMA } from '../features/report/ReportConfig.js';
import { PLUGIN_CONFIG_SCHEMA as PACKAGE_JSON_CONFIG_SCHEMA } from '../features/packageJson/PackageJsonConfig.js';
import { PLUGIN_CONFIG_SCHEMA as PACKAGE_MANAGER_CONFIG_SCHEMA } from '../features/packageManager/PackageManagerConfig.js';
import { PreflightValidationException } from '../exceptions/DomainException.js';

describe('PreflightService', () => {
  const service = (packages: [string, { name: string; version: string; private?: boolean; publishConfig?: { access?: string } }][], filesExist = true) => {
    const fs = new Mock<IFileSystemService>()
      .setup((m) => m.readRootPackageJsonOrFail())
      .returns({ name: 'root', version: '1.0.0', workspaces: ['packages/*'] })
      .setup((m) => m.findManyPackageJsonByGlob(It.IsAny()))
      .returns(packages)
      .setup((m) => m.fileExists(It.IsAny()))
      .returns(filesExist);
    const configs = new Mock<IPluginsConfigService>()
      .setup((m) => m.getConfig('report', REPORT_CONFIG_SCHEMA))
      .returns(REPORT_CONFIG_SCHEMA.parse({}))
      .setup((m) => m.getConfig('package-json', PACKAGE_JSON_CONFIG_SCHEMA))
      .returns(PACKAGE_JSON_CONFIG_SCHEMA.parse({}))
      .setup((m) => m.getConfig('package-manager', PACKAGE_MANAGER_CONFIG_SCHEMA))
      .returns(PACKAGE_MANAGER_CONFIG_SCHEMA.parse({}))
      .setup((m) => m.getConfig('vcs', VCS_CONFIG_SCHEMA))
      .returns(VCS_CONFIG_SCHEMA.parse({}))
      .setup((m) => m.getConfig('changelog', CHANGELOG_CONFIG_SCHEMA))
      .returns(CHANGELOG_CONFIG_SCHEMA.parse({}))
      .setup((m) => m.getConfig('release-notes', RELEASE_NOTES_CONFIG_SCHEMA))
      .returns(RELEASE_NOTES_CONFIG_SCHEMA.parse({}));
    const releaseNotes = new Mock<ReleaseNotesService>().setup((m) => m.isCliAvailable()).returns(true);

    return new PreflightService(fs.object(), configs.object(), releaseNotes.object());
  };

  it('given valid workspace packages when preflight runs then optional release-notes setup is a warning', () => {
    const preflight = service([['/repo/packages/pkg-a', { name: 'pkg-a', version: '1.0.0' }]]);

    expect(preflight.validate()).toEqual([
      'GitHub release notes are optional; before running release-notes, set release.release-notes.repository/token or GITHUB_REPOSITORY/GITHUB_TOKEN',
    ]);
  });

  it('given workspace globs that match no package files when preflight runs then it suggests fixing workspaces', () => {
    const preflight = service([]);

    expect(() => preflight.validate()).toThrow(
      'No package.json files matched root package.json#workspaces; add valid package globs (this tool does not read pnpm-workspace.yaml)',
    );
  });

  it('given a scoped package without public access when preflight runs then it fails before publishing', () => {
    const preflight = service([['/repo/packages/pkg-a', { name: '@scope/pkg-a', version: '1.0.0' }]]);

    expect(() => preflight.validate()).toThrow(PreflightValidationException);
    expect(() => preflight.validate()).toThrow(/publishConfig\.access to "public"/);
  });

  it('given a configured template that does not exist when preflight runs then it reports the template path', () => {
    const fs = new Mock<IFileSystemService>()
      .setup((m) => m.readRootPackageJsonOrFail())
      .returns({ name: 'root', version: '1.0.0', workspaces: ['packages/*'] })
      .setup((m) => m.findManyPackageJsonByGlob(It.IsAny()))
      .returns([['/repo/packages/pkg-a', { name: 'pkg-a', version: '1.0.0' }]])
      .setup((m) => m.fileExists(It.IsAny()))
      .returns(false);
    const configs = new Mock<IPluginsConfigService>()
      .setup((m) => m.getConfig('report', REPORT_CONFIG_SCHEMA))
      .returns(REPORT_CONFIG_SCHEMA.parse({}))
      .setup((m) => m.getConfig('package-json', PACKAGE_JSON_CONFIG_SCHEMA))
      .returns(PACKAGE_JSON_CONFIG_SCHEMA.parse({}))
      .setup((m) => m.getConfig('package-manager', PACKAGE_MANAGER_CONFIG_SCHEMA))
      .returns(PACKAGE_MANAGER_CONFIG_SCHEMA.parse({}))
      .setup((m) => m.getConfig('vcs', VCS_CONFIG_SCHEMA))
      .returns(VCS_CONFIG_SCHEMA.parse({ template: 'missing.hbs' }))
      .setup((m) => m.getConfig('changelog', CHANGELOG_CONFIG_SCHEMA))
      .returns(CHANGELOG_CONFIG_SCHEMA.parse({}))
      .setup((m) => m.getConfig('release-notes', RELEASE_NOTES_CONFIG_SCHEMA))
      .returns(RELEASE_NOTES_CONFIG_SCHEMA.parse({}));
    const releaseNotes = new Mock<ReleaseNotesService>().setup((m) => m.isCliAvailable()).returns(true);
    const preflight = new PreflightService(fs.object(), configs.object(), releaseNotes.object());

    expect(() => preflight.validate()).toThrow(/Configured vcs template "missing\.hbs" does not exist/);
  });
});
