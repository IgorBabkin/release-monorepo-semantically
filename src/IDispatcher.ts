import {bindTo, IContainer, inject, register, resolveArgs, select, SingleToken} from "ts-ioc-container";

export interface IDispatcher {
    dispatch(message: string, args: string[]): void;
}

export const IDispatcherKey = new SingleToken<IDispatcher>('IDispatcher');

@register(bindTo(IDispatcherKey))
export class Dispatcher implements IDispatcher {
    constructor(@inject(select.scope.current) private container: IContainer) {
    }

    dispatch(message: string, args: string[]): void {
        const [controllerAlias, actionAlias = 'default'] = message.split(':');
        const controller = this.container.resolve(controllerAlias);
        const actionName = findMethodNameByAlias(controller, actionAlias);
        const action = controller[actionName];
        const deps = resolveArgs(controller.constructor as constructor<unknown>, actionName)(args);
        action.apply(controller, deps);
    }
}
