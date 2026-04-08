import { IContainer, IContainerModule, Registration as R } from 'ts-ioc-container';
import { ChangelogController } from './ChangelogController';

export class ChangelogModule implements IContainerModule {
  applyTo(container: IContainer): void {
    container.addRegistration(R.fromClass(ChangelogController));
  }
}
