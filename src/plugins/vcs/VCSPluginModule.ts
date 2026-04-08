import { IContainer, IContainerModule, Registration as R } from 'ts-ioc-container';
import { GitService } from './services/GitService';
import { VCSController } from './VCSController';

export class VCSPluginModule implements IContainerModule {
  applyTo(container: IContainer) {
    container.addRegistration(R.fromClass(VCSController));
    container.addRegistration(R.fromClass(GitService));
  }
}
