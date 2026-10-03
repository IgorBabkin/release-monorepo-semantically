import { describe, expect, it } from 'vitest';
import { It, Mock, Times } from 'moq.ts';
import { CheckController } from './CheckController.js';
import { PreflightService } from '../../services/PreflightService.js';
import { ILogger } from '../../services/ConsoleLogger.js';

describe('CheckController', () => {
  it('given passing checks with optional setup warnings when check runs then it reports warnings and succeeds', () => {
    const preflight = new Mock<PreflightService>().setup((m) => m.validate()).returns(['GitHub release notes are optional']);
    const logger = new Mock<ILogger>().setup((m) => m.info(It.IsAny())).returns(undefined);

    new CheckController(preflight.object(), logger.object()).run();

    logger.verify((m) => m.info('⚠ GitHub release notes are optional'), Times.Once());
    logger.verify((m) => m.info('Preflight checks passed'), Times.Once());
  });

  it('given failed checks when check runs then it fails rather than reporting success', () => {
    const error = new Error('invalid setup');
    const preflight = new Mock<PreflightService>().setup((m) => m.validate()).throws(error);
    const logger = new Mock<ILogger>().setup((m) => m.info(It.IsAny())).returns(undefined);

    expect(() => new CheckController(preflight.object(), logger.object()).run()).toThrow(error);
    logger.verify((m) => m.info(It.IsAny()), Times.Never());
  });
});
