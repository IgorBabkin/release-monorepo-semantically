import {Container, IContainer} from "ts-ioc-container";
import {CommonDeps} from "./di/CommonDeps";
import {IDispatcherKey} from "./IDispatcher";
import {IExceptionHandlerKey} from "./IErrorHandler";

export function bootstrap(container: IContainer) {
    const dispatcher = IDispatcherKey.resolve(container);
    const errorHandlerList = IExceptionHandlerKey.resolve(container);
    try {
        const command = process.argv[1];
        const args = process.argv.slice(2);
        dispatcher.dispatch(command, args);
    } catch (error) {
        const handler = errorHandlerList.sort((a, b) => a.priority - b.priority).find(handler => handler.matches(error));
        if (!handler) {
            throw new Error('Cannot find error handler');
        }
        handler.handle(error);
    } finally {
        container.dispose();
    }
}

const container = new Container().useModule(new CommonDeps());
bootstrap(container);
