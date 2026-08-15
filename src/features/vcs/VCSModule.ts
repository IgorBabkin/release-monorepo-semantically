import { IContainer, IContainerModule, Registration as R } from 'ts-ioc-container';
import { GitService } from './services/GitService.js';
import { VCSController } from './VCSController.js';

export class VCSModule implements IContainerModule {
  applyTo(container: IContainer) {
    container.addRegistration(R.fromClass(VCSController));
    container.addRegistration(R.fromClass(GitService));
  }
}
