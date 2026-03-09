import { bindTo, IContainer, inject, onConstruct, register, SingleToken, singleton } from 'ts-ioc-container';
import { z, ZodType } from 'zod';
import { execute } from '../utils/hooks';
import path from 'node:path';
import { globalConfig } from './GlobalConfig';
import * as fs from 'node:fs';

export interface IPluginsConfigService {
  getConfigAndCache<T extends ZodType>(key: string, schema: T): z.infer<T> | null;
}
export const IPluginsConfigServiceKey = new SingleToken<IPluginsConfigService>('IPluginsConfigService');
export const pluginConfig = (key: string, schema: ZodType) => (c: IContainer) => {
  const service = IPluginsConfigServiceKey.resolve(c);
  return service.getConfigAndCache(key, schema);
};

@register(bindTo(IPluginsConfigServiceKey), singleton())
export class PluginsConfigService implements IPluginsConfigService {
  private config: Record<string, unknown> = {};
  private cache: Map<string, unknown> = new Map();

  constructor(@inject(globalConfig('cwd')) private readonly cwd: string) {}

  @onConstruct(execute())
  loadConfigFromPackageJsonFile() {
    const packageJsonPath = path.join(this.cwd, 'package.json');
    try {
      const packageJson = fs.readFileSync(packageJsonPath, 'utf8');
      const parsedPackageJson = JSON.parse(packageJson);
      this.config = parsedPackageJson.release || {};
    } catch (error) {
      console.error('Failed to load plugins configuration from package.json:', error);
    }
  }

  @onConstruct(execute())
  loadConfigFromFile() {
    const packageJsonPath = path.join(this.cwd, 'package.json');
    try {
      const packageJson = fs.readFileSync(packageJsonPath, 'utf8');
      const parsedPackageJson = JSON.parse(packageJson);
      this.config = parsedPackageJson.release || {};
    } catch (error) {
      console.error('Failed to load plugins configuration from package.json:', error);
    }
  }

  getConfigAndCache<T extends ZodType>(key: string, schema: T): z.infer<T> | null {
    if (!this.cache.has(key)) {
      const config = this.config[key];
      if (!config) {
        return null;
      }
      this.cache.set(key, schema.parse(config));
    }
    return this.cache.get(key) as z.infer<T>;
  }
}
