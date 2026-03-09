import { IContainer, IContainerModule, Registration as R } from 'ts-ioc-container';
import { GitService } from './services/GitService';
import { VCSPlugin } from './VCSPlugin';

export class VCSPluginModule implements IContainerModule {
  applyTo(container: IContainer) {
    container.addRegistration(R.fromClass(VCSPlugin));
    container.addRegistration(R.fromClass(GitService));
  }
}
