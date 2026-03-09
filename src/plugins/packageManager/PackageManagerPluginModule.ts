import { IContainer, IContainerModule, Registration as R } from 'ts-ioc-container';
import { PackageManagerPlugin } from './PackageManagerPlugin';
import { PNPMPackageManager } from './services/PNPMPackageManager';

export class PackageManagerPluginModule implements IContainerModule {
  applyTo(container: IContainer): void {
    container.addRegistration(R.fromClass(PNPMPackageManager));
    container.addRegistration(R.fromClass(PackageManagerPlugin));
  }
}
