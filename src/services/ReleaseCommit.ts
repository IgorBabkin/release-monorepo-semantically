import { GitService } from './GitService';
import { HandlebarsRenderService } from './HandlebarsRenderService';

export class ReleaseCommit {
  private readonly commitTemplatePath: string;

  constructor(
    private readonly vscService: GitService,
    private readonly renderService: HandlebarsRenderService,
    commitTemplatePath = 'templates/release-commit-msg.hbs',
  ) {
    this.commitTemplatePath = commitTemplatePath;
  }

  commit(context: Record<string, unknown>): void {
    this.vscService.commit(this.renderService.render(this.commitTemplatePath, context));
  }
}
