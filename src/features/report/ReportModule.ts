import { IContainer, IContainerModule, Registration as R } from 'ts-ioc-container';
import { ReportController } from './ReportController.js';
import { StdOutputService } from '../../services/OutputService.js';

export class ReportModule implements IContainerModule {
  applyTo(container: IContainer): void {
    container.addRegistration(R.fromClass(StdOutputService)).addRegistration(R.fromClass(ReportController));
  }
}
