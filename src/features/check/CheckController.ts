import { inject, register } from 'ts-ioc-container';
import { action, execute, onDefault } from '../../cli/index.js';
import { ILogger, ILoggerKey } from '../../services/ConsoleLogger.js';
import { PreflightService, PreflightServiceKey } from '../../services/PreflightService.js';

@register('check')
export class CheckController {
  constructor(
    @inject(PreflightServiceKey) private readonly preflight: PreflightService,
    @inject(ILoggerKey.args('check')) private readonly logger: ILogger,
  ) {}

  @onDefault(execute())
  @action('run', execute())
  run(): void {
    for (const warning of this.preflight.validate()) {
      this.logger.info(`⚠ ${warning}`);
    }
    this.logger.info('Preflight checks passed');
  }
}
