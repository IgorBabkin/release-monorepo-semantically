import { HandlebarsRenderService } from './HandlebarsRenderService';
import { NpmPackage } from '../models/NpmPackage';
import { ConventionalCommit } from '../models/ConventionalCommit';

export const DEFAULT_RELEASE_COMMIT_TEMPLATE = 'templates/release-commit-msg.hbs';

export class ReleaseCommitView {
  constructor(
    private readonly commitTemplatePath = DEFAULT_RELEASE_COMMIT_TEMPLATE,
    private readonly renderService: HandlebarsRenderService,
  ) {}

  render(context: { releasedVersions: Map<string, string>; releasedPackages: NpmPackage[]; releasedCommits: Map<string, ConventionalCommit[]> }): string {
    return this.renderService.render(this.commitTemplatePath, context);
  }
}
