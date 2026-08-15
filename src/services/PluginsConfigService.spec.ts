import 'reflect-metadata';
import { describe, expect, it, vi } from 'vitest';
import { z, type ZodType } from 'zod';
import { PluginsConfigService } from './PluginsConfigService.js';
import { InvalidConfigException } from '../exceptions/DomainException.js';

describe('PluginsConfigService.getConfig', () => {
  it('given a section that is absent from config when requested then schema defaults are returned instead of throwing', () => {
    const schema = z.object({ dryRun: z.boolean().default(false), kind: z.enum(['git']).default('git') });
    const service = new PluginsConfigService('/repo', { info: vi.fn() } as never);
    (service as unknown as { config: Record<string, unknown> }).config = {};

    expect(service.getConfig('vcs', schema)).toEqual({ dryRun: false, kind: 'git' });
  });

  it('given a config section that fails validation when requested then InvalidConfigException is thrown', () => {
    const schema = z.object({ kind: z.enum(['pnpm', 'npm', 'yarn']) });
    const service = new PluginsConfigService('/repo', { info: vi.fn() } as never);
    (service as unknown as { config: Record<string, unknown> }).config = {
      'package-manager': { kind: 'not-a-real-package-manager' },
    };

    expect(() => service.getConfig('package-manager', schema)).toThrow(InvalidConfigException);
  });

  it('given the same key and schema when config is requested repeatedly then the parsed value is returned from shallow cache', () => {
    const schema = {
      safeParse: vi.fn().mockReturnValue({ success: true, data: { disabled: false } }),
    } as unknown as ZodType;
    const service = new PluginsConfigService('/repo', { info: vi.fn() } as never);

    (service as unknown as { config: Record<string, unknown> }).config = {
      vcs: { disabled: false },
    };

    const first = service.getConfig('vcs', schema);
    const second = service.getConfig('vcs', schema);

    expect(first).toEqual({ disabled: false });
    expect(second).toBe(first);
    expect(schema.safeParse).toHaveBeenCalledTimes(1);
    expect(schema.safeParse).toHaveBeenCalledWith({ disabled: false });
  });

  it('given different shallow arguments when config is requested then each combination is cached separately', () => {
    const firstSchema = {
      safeParse: vi.fn().mockReturnValue({ success: true, data: { kind: 'git' } }),
    } as unknown as ZodType;
    const secondSchema = {
      safeParse: vi.fn().mockReturnValue({ success: true, data: { kind: 'pnpm' } }),
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

    expect(firstSchema.safeParse).toHaveBeenCalledTimes(1);
    expect(secondSchema.safeParse).toHaveBeenCalledTimes(1);
  });
});
