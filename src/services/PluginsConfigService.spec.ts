import 'reflect-metadata';
import { describe, expect, it, vi } from 'vitest';
import type { ZodType } from 'zod';
import { PluginsConfigService } from './PluginsConfigService';

describe('PluginsConfigService.getConfig', () => {
  it('given the same key and schema when config is requested repeatedly then the parsed value is returned from shallow cache', () => {
    const schema = {
      parse: vi.fn().mockReturnValue({ disabled: false }),
    } as unknown as ZodType;
    const service = new PluginsConfigService('/repo', { info: vi.fn() } as never);

    (service as unknown as { config: Record<string, unknown> }).config = {
      vcs: { disabled: false },
    };

    const first = service.getConfig('vcs', schema);
    const second = service.getConfig('vcs', schema);

    expect(first).toEqual({ disabled: false });
    expect(second).toBe(first);
    expect(schema.parse).toHaveBeenCalledTimes(1);
    expect(schema.parse).toHaveBeenCalledWith({ disabled: false });
  });

  it('given different shallow arguments when config is requested then each combination is cached separately', () => {
    const firstSchema = {
      parse: vi.fn().mockReturnValue({ kind: 'git' }),
    } as unknown as ZodType;
    const secondSchema = {
      parse: vi.fn().mockReturnValue({ kind: 'pnpm' }),
    } as unknown as ZodType;
    const service = new PluginsConfigService('/repo', { info: vi.fn() } as never);

    (service as unknown as { config: Record<string, unknown> }).config = {
      vcs: { kind: 'git' },
      'package-manager': { kind: 'pnpm' },
    };

    service.getConfig('vcs', firstSchema);
    service.getConfig('package-manager', secondSchema);
    service.getConfig('vcs', firstSchema);
    service.getConfig('package-manager', secondSchema);

    expect(firstSchema.parse).toHaveBeenCalledTimes(1);
    expect(secondSchema.parse).toHaveBeenCalledTimes(1);
  });
});
