import { IContainer, IContainerModule, Registration as R } from 'ts-ioc-container';
import { PackageController } from './PackageController';

export class PackageJsonPluginModule implements IContainerModule {
  applyTo(container: IContainer): void {
    container.addRegistration(R.fromClass(PackageController));
  }
}
