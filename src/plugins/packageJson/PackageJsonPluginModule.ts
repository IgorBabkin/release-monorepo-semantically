import { IContainer, IContainerModule, Registration as R } from 'ts-ioc-container';
import { PackageJsonPlugin } from './PackageJsonPlugin';

export class PackageJsonPluginModule implements IContainerModule {
  applyTo(container: IContainer): void {
    container.addRegistration(R.fromClass(PackageJsonPlugin));
  }
}
