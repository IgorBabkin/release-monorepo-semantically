import { describe, expect, it } from 'vitest';
import { CliOptionsService } from './CliOptionsService';

describe('CliOptionsService', () => {
  it('given --help when options are parsed then help mode is returned', () => {
    const service = new CliOptionsService();

    expect(service.parse('--help')).toEqual({
      help: true,
    });
  });

  it('given no flags when options are parsed then normal mode is returned', () => {
    const service = new CliOptionsService();

    expect(service.parse()).toEqual({
      help: false,
    });
  });

  it('given unknown arguments when options are parsed then commander errors are surfaced', () => {
    const service = new CliOptionsService();

    expect(() => service.parse('--dry-run')).toThrowError('unknown option');
  });
});
