import { IContainer, IContainerModule, Registration as R } from 'ts-ioc-container';
import { ReportController } from './ReportController';

export class ReportModule implements IContainerModule {
  applyTo(container: IContainer): void {
    container.addRegistration(R.fromClass(ReportController));
  }
}
