import { afterEach, describe, expect, it, vi } from 'vitest';
import { ConsoleLogger } from './ConsoleLogger';

describe('ConsoleLogger', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('given a release step when info logs then it prefixes the message with an emoji', () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const logger = new ConsoleLogger('Release');

    logger.info('SKIP     pkg-a@1.0.0');

    expect(infoSpy).toHaveBeenCalledWith('[Release]', '⚠ SKIP     pkg-a@1.0.0');
  });

  it('given a plain message when info logs then it preserves the message text', () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const logger = new ConsoleLogger('Release');

    logger.info('plain message');

    expect(infoSpy).toHaveBeenCalledWith('[Release]', 'plain message');
  });
});
