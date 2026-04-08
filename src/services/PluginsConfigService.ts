import { bindTo, IContainer, inject, onConstruct, register, SingleToken, singleton } from 'ts-ioc-container';
import { z, ZodType } from 'zod';
import { execute } from '../utils/hooks';
import path from 'node:path';
import { globalConfig } from '../models/GlobalConfig';
import * as fs from 'node:fs';
import { ILogger, ILoggerKey } from './ConsoleLogger';

export interface IPluginsConfigService {
  getConfig<T extends ZodType>(key: string, schema: T): z.infer<T> | null;
}
export const IPluginsConfigServiceKey = new SingleToken<IPluginsConfigService>('IPluginsConfigService');
export const pluginsConfigService = (key: string, schema: ZodType) => (c: IContainer) => IPluginsConfigServiceKey.resolve(c).getConfig(key, schema);

@register(bindTo(IPluginsConfigServiceKey), singleton())
export class PluginsConfigService implements IPluginsConfigService {
  private config: Record<string, unknown> = {};
  private readonly cache = new Map<string, WeakMap<ZodType, unknown>>();

  constructor(
    @inject(globalConfig('cwd')) private readonly cwd: string,
    @inject(ILoggerKey.args('PluginsConfigService')) private readonly logger: ILogger,
  ) {}

  @onConstruct(execute())
  loadConfigFromPackageJsonFile() {
    const packageJsonPath = path.join(this.cwd, 'package.json');
    try {
      const packageJson = fs.readFileSync(packageJsonPath, 'utf8');
      const parsedPackageJson = JSON.parse(packageJson);
      this.config = parsedPackageJson.release || {};

      if (this.config) {
        this.logger.info(`Config found in ${packageJsonPath}`);
      }
    } catch {
      throw new Error(`Failed to load plugins configuration from package.json: ${packageJsonPath}`);
    }
  }

  @onConstruct(execute())
  loadConfigFromFile() {
    const packageJsonPath = path.join(this.cwd, '.release.json');
    if (!fs.existsSync(packageJsonPath)) {
      return;
    }
    try {
      const packageJson = fs.readFileSync(packageJsonPath, 'utf8');
      this.config = JSON.parse(packageJson);
      this.logger.info(`Config found in ${packageJsonPath}`);
    } catch {
      throw new Error(`Failed to load plugins configuration from .release.json: ${packageJsonPath}`);
    }
  }

  getConfig<T extends ZodType>(key: string, schema: T): z.infer<T> | null {
    let keyCache = this.cache.get(key);
    if (!keyCache) {
      keyCache = new WeakMap();
      this.cache.set(key, keyCache);
    }
    if (keyCache.has(schema)) {
      return keyCache.get(schema) as z.infer<T>;
    }
    const config = this.config[key];
    if (!config) {
      return null;
    }
    const result = schema.parse(config);
    keyCache.set(schema, result);
    return result;
  }
}
