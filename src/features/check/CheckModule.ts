import { IContainer, IContainerModule, Registration as R } from 'ts-ioc-container';
import { CheckController } from './CheckController.js';

export class CheckModule implements IContainerModule {
  applyTo(container: IContainer): void {
    container.addRegistration(R.fromClass(CheckController));
  }
}
