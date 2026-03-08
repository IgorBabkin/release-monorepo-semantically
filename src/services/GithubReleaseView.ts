import { HandlebarsRenderService } from './HandlebarsRenderService';
import { ConventionalCommit } from '../models/ConventionalCommit';
import { DependencyVersionChange } from '../models/ReleaseTypes';

export const DEFAULT_GITHUB_RELEASE_NOTES_TEMPLATE = 'templates/github-release-notes.hbs';

export interface GithubReleaseViewContext extends Record<string, unknown> {
  packageName: string;
  version: string;
  commits: ConventionalCommit[];
  dependencyUpdates: DependencyVersionChange[];
}

export class GithubReleaseView {
  constructor(
    private readonly templatePath = DEFAULT_GITHUB_RELEASE_NOTES_TEMPLATE,
    private readonly renderService: HandlebarsRenderService,
  ) {}

  render(context: GithubReleaseViewContext): string {
    return this.renderService.render(this.templatePath, context);
  }
}
