import { IContainer, inject, onConstruct, register, shallowCache, SingleToken, singleton } from 'ts-ioc-container';
import { z, ZodType } from 'zod';
import { execute } from '../cli/execute.js';
import path from 'node:path';
import { globalConfig } from '../domain/GlobalConfig.js';
import * as fs from 'node:fs';
import { ILogger, ILoggerKey } from './ConsoleLogger.js';
import { InvalidConfigException } from '../exceptions/DomainException.js';

export const CONFIG_FILE_NAME = '.release.json';

export interface IPluginsConfigService {
  getConfig<T extends ZodType>(key: string, schema: T): z.infer<T>;
}

export const IPluginsConfigServiceKey = new SingleToken<IPluginsConfigService>('IPluginsConfigService');
export const pluginsConfigService = (key: string, schema: ZodType) => (c: IContainer) => IPluginsConfigServiceKey.resolve(c).getConfig(key, schema);

@register(IPluginsConfigServiceKey, singleton())
export class PluginsConfigService implements IPluginsConfigService {
  private config: Record<string, unknown> = {};

  constructor(
    @inject(globalConfig('cwd')) private readonly cwd: string,
    @inject(ILoggerKey.args('config')) private readonly logger: ILogger,
  ) {}

  @onConstruct(execute())
  loadConfigFromPackageJson() {
    const packageJsonPath = path.join(this.cwd, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      return;
    }

    const packageJson = this.readJsonOrFail(packageJsonPath);
    const release = packageJson.release;
    if (release && typeof release === 'object') {
      this.config = release as Record<string, unknown>;
      this.logger.info(`Config found in ${packageJsonPath}`);
    }
  }

  @onConstruct(execute())
  loadConfigFromFile() {
    const configPath = path.join(this.cwd, CONFIG_FILE_NAME);
    if (!fs.existsSync(configPath)) {
      return;
    }

    // The dedicated file wins per feature, but does not wipe features that are
    // only configured in package.json.
    this.config = { ...this.config, ...this.readJsonOrFail(configPath) };
    this.logger.info(`Config found in ${configPath}`);
  }

  @shallowCache((...args) => args[0])
  getConfig<T extends ZodType>(key: string, schema: T): z.infer<T> {
    const result = schema.safeParse(this.config[key] ?? {});
    if (!result.success) {
      throw new InvalidConfigException(key, z.prettifyError(result.error));
    }
    return result.data;
  }

  private readJsonOrFail(filePath: string): Record<string, unknown> {
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (error) {
      throw new InvalidConfigException(filePath, error instanceof Error ? error.message : String(error));
    }
  }
}
