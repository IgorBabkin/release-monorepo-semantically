import { IContainer, IContainerModule, Registration as R } from 'ts-ioc-container';
import { GithubService } from './services/GithubService';
import { ReleaseNotesController } from './ReleaseNotesController';

export class ReleaseNotesPluginModule implements IContainerModule {
  applyTo(container: IContainer) {
    container.addRegistration(R.fromClass(GithubService));
    container.addRegistration(R.fromClass(ReleaseNotesController));
  }
}
