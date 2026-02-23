import { GitService } from './GitService';
import { HandlebarsRenderService } from './HandlebarsRenderService';

export class ReleaseCommit {
  constructor(
    private vscService: GitService,
    private readonly renderService: HandlebarsRenderService,
  ) {}

  commit(context: Record<string, unknown>): void {
    this.vscService.commit(this.renderService.render('templates/release-commit-msg.hbs', context));
  }
}
