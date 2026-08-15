import { IContainer, IContainerModule, Registration as R } from 'ts-ioc-container';
import { PackageManagerController } from './PackageManagerController.js';
import { PNPMPackageManager } from './services/PNPMPackageManager.js';

export class PackageManagerModule implements IContainerModule {
  applyTo(container: IContainer): void {
    container.addRegistration(R.fromClass(PNPMPackageManager));
    container.addRegistration(R.fromClass(PackageManagerController));
  }
}
