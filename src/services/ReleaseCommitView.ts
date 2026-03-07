import { HandlebarsRenderService } from './HandlebarsRenderService';

export class ReleaseCommitView {
  constructor(
    private readonly renderService: HandlebarsRenderService,
    private readonly commitTemplatePath = 'templates/release-commit-msg.hbs',
  ) {}

  render(context: Record<string, unknown>): string {
    return this.renderService.render(this.commitTemplatePath, context);
  }
}
