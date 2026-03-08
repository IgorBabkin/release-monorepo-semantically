import { ConventionalCommit } from '../models/ConventionalCommit';
import { HandlebarsRenderService } from './HandlebarsRenderService';
import { NpmPackage } from '../models/NpmPackage';

export class ChangelogView {
  constructor(
    private readonly changelogTemplatePath = 'templates/changelog.hbs',
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
    // const breakingChanges = commits.filter((commit) => commit.isBreaking);
    // const features = commits.filter((commit) => commit.type === 'feat');
    // const fixes = commits.filter((commit) => commit.type === 'fix');
    // const performance = commits.filter((commit) => commit.type === 'perf');

    return this.renderService.render(this.changelogTemplatePath, {
      pkg,
      releasedCommits,
      releasedPackages,
      releasedVersions,
      existing,
    });
  }
}
