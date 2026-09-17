import {
  hook,
  HookCollector,
  type HookType,
  IContainer,
  Is,
  oncePerInstance,
  onResolve,
  type ProviderOptions,
  type ProviderPipe,
  runAtOnce,
  sequential,
  toTask,
} from 'ts-ioc-container';

export const commandArgs = (c: IContainer, { args = [] }: ProviderOptions): string[] => args.map(String);

export const onResolveOnce = (...hooks: HookType[]) => hook('onResolve', oncePerInstance(sequential(...hooks)));

const onResolveHookCollector = new HookCollector({ key: 'onResolve' });

const runResolveHooks = (dependency: unknown, scope: IContainer): void => {
  if (!Is.object(dependency)) return;
  runAtOnce(onResolveHookCollector.getActions(dependency, { scope }).map(toTask));
};

export const resolved = <T = unknown>(): ProviderPipe<T> => onResolve<T>(runResolveHooks);
