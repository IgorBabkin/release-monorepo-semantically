import { IContainer, SingleToken } from 'ts-ioc-container';
import { ZodType } from 'zod';

export type PluginsConfig = Record<string, unknown>;
export const PluginsConfigKey = new SingleToken<PluginsConfig>('PluginsConfig');
export const pluginConfig = (key: string, schema: ZodType) => (c: IContainer) => {
  const config = PluginsConfigKey.resolve(c)[key];
  return config ? schema.parse(config) : null;
};
