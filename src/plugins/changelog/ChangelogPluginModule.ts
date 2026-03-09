import { IContainer, IContainerModule, Registration as R } from 'ts-ioc-container';
import { ChangelogPlugin } from './ChangelogPlugin';

export class ChangelogPluginModule implements IContainerModule {
  applyTo(container: IContainer): void {
    container.addRegistration(R.fromClass(ChangelogPlugin));
  }
}
