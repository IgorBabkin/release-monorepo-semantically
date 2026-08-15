import { IContainer, SingleToken } from 'ts-ioc-container';

export type GlobalConfig = {
  cwd: string;
};
export const GlobalConfigKey = new SingleToken<GlobalConfig>('GlobalConfig');
export function globalConfig<K extends keyof GlobalConfig>(key: K) {
  return (c: IContainer) => GlobalConfigKey.resolve(c)[key];
}
