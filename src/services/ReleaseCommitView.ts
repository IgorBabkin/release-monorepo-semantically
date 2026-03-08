import { HandlebarsRenderService } from './HandlebarsRenderService';
import { NpmPackage } from '../models/NpmPackage';
import { ConventionalCommit } from '../models/ConventionalCommit';

export class ReleaseCommitView {
  constructor(
    private readonly commitTemplatePath = 'templates/release-commit-msg.hbs',
    private readonly renderService: HandlebarsRenderService,
  ) {}

  render(context: { releasedVersions: Map<string, string>; releasedPackages: NpmPackage[]; releasedCommits: Map<string, ConventionalCommit[]> }): string {
    return this.renderService.render(this.commitTemplatePath, context);
  }
}
