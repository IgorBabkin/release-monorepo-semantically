import { ConventionalCommit } from '../models/ConventionalCommit';
import { HandlebarsRenderService } from './HandlebarsRenderService';
import { NpmPackage } from '../models/NpmPackage';

export const DEFAULT_CHANGELOG_TEMPLATE = 'templates/changelog.hbs';

export class ChangelogView {
  constructor(
    private readonly changelogTemplatePath = DEFAULT_CHANGELOG_TEMPLATE,
    private readonly renderService: HandlebarsRenderService,
  ) {}

  render({
    pkg,
    releasedCommits,
    releasedPackages,
    releasedVersions,
    existing,
  }: {
    pkg: NpmPackage;
    releasedVersions: Map<string, string>;
    releasedPackages: NpmPackage[];
    releasedCommits: ConventionalCommit[];
    existing: string;
  }): string {
    const nextVersion = releasedVersions.get(pkg.name) ?? pkg.version;
    const dependencyUpdates = pkg.getDependencyUpdates(releasedVersions);
    const breakingChanges = releasedCommits.filter((commit) => commit.isBreaking);
    const features = releasedCommits.filter((commit) => commit.type === 'feat');
    const fixes = releasedCommits.filter((commit) => commit.type === 'fix');
    const performance = releasedCommits.filter((commit) => commit.type === 'perf');

    return this.renderService.render(this.changelogTemplatePath, {
      pkg,
      releasedCommits,
      releasedPackages,
      releasedVersions,
      // Keep backward-compatible data for user-provided templates.
      entry: {
        version: nextVersion,
        oldVersion: pkg.version,
        date: new Date().toISOString().slice(0, 10),
        breakingChanges,
        features,
        fixes,
        performance,
        dependencyUpdates,
      },
      existing,
    });
  }
}
