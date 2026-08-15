import { createHookContextFactory, HooksRunner, type IContainer } from 'ts-ioc-container';
import { MissingControllerException } from '../exceptions/DomainException.js';
import { IErrorHandler, IErrorHandlerKey } from './IErrorHandler.js';
import { DEFAULT_ACTION } from './decorators.js';

/**
 * Splits `<controller> [action] [--flags...]` into its leading positionals.
 * This can't be done with commander's argument parser: with
 * allowUnknownOption() set (needed so each action's own --flags pass through
 * untouched), commander pushes unrecognized flags into the same `.args` array
 * as positionals instead of skipping them, so `[action]` would capture
 * `--context` itself rather than staying unset.
 */
function parseControllerAndAction(argv: string[]): { controller: string; action: string } {
  const [controller, maybeAction] = argv;
  if (!controller) {
    throw new MissingControllerException();
  }
  const action = maybeAction && !maybeAction.startsWith('-') ? maybeAction : DEFAULT_ACTION;
  return { controller, action };
}

/**
 * Minimal replacement for ib-commander's Application: resolves a controller by
 * its bindTo name, runs the hooks registered under the requested action, and
 * routes failures to the bound IErrorHandler. Kept in-repo because ib-commander
 * pins ts-ioc-container ^47, which this project has moved past.
 */
export class Application {
  static bootstrap(container: IContainer): Application {
    return new Application(container, IErrorHandlerKey.resolve(container));
  }

  private constructor(
    private readonly scope: IContainer,
    private readonly errorHandler: IErrorHandler,
  ) {}

  run(...argv: string[]): void {
    try {
      const { controller, action } = parseControllerAndAction(argv);
      const controllerInstance = this.scope.resolve<object>(controller);
      const createContext = createHookContextFactory({ args: argv });
      new HooksRunner(action).execute(controllerInstance, { scope: this.scope, createContext });
    } catch (error) {
      this.errorHandler.handleError(error);
    } finally {
      this.scope.dispose();
    }
  }
}
