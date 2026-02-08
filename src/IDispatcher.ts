import {
  bindTo,
  constructor,
  type DependencyKey,
  getMethodMetadata,
  getParameterMetadata,
  IContainer,
  inject,
  register,
  select,
  SingleToken,
} from 'ts-ioc-container';

export interface IDispatcher {
  dispatch(message: string, args: string[]): void;
}

export const IDispatcherKey = new SingleToken<IDispatcher>('IDispatcher');

function findMethodNameByAlias(controller: Record<string, unknown>, actionAlias: string): string {
  const proto = (controller.constructor as constructor<unknown>).prototype as object;
  const names = Object.getOwnPropertyNames(proto).filter((k) => k !== 'constructor' && typeof (controller as Record<string, unknown>)[k] === 'function');
  for (const name of names) {
    const meta = getMethodMetadata('action', proto, name) as { default?: boolean } | undefined;
    if (actionAlias === 'default' && meta?.default) return name;
    if (actionAlias === name || (meta as { alias?: string } | undefined)?.alias === actionAlias) return name;
  }
  throw new Error(`Action not found: ${actionAlias}`);
}

@register(bindTo(IDispatcherKey))
export class Dispatcher implements IDispatcher {
  constructor(@inject(select.scope.current) private container: IContainer) {}

  dispatch(message: string, args: string[]): void {
    const [controllerAlias, actionAlias = 'default'] = message.split(':');
    const controller = this.container.resolve(controllerAlias) as Record<string, unknown>;
    const actionName = findMethodNameByAlias(controller, actionAlias);
    const action = controller[actionName] as (...deps: unknown[]) => unknown;
    const injectMetaKey = `inject:${actionName}`;
    const proto = (controller.constructor as constructor<unknown>).prototype as constructor<unknown>;
    const paramMeta = getParameterMetadata(injectMetaKey, proto) as Array<((a: string[]) => unknown) | unknown>;
    const deps = paramMeta.map((fn) =>
      typeof fn === 'function' ? (fn as (a: string[]) => unknown)(args) : this.container.resolve(fn as constructor<unknown> | DependencyKey),
    );
    action.apply(controller, deps);
  }
}
