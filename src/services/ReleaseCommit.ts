import { VcsService } from './VcsService';
import { RenderService } from './RenderService';

export class ReleaseCommit {
  constructor(
    private vscService: VcsService,
    private readonly renderService: RenderService,
  ) {}

  commit(context: Record<string, unknown>): void {
    this.vscService.commit(this.renderService.render('templates/release-commit-msg.hbs', context));
  }
}
