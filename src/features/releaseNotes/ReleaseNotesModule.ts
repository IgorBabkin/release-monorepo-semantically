import { IContainer, IContainerModule, Registration as R } from 'ts-ioc-container';
import { GithubService } from './services/GithubService.js';
import { ReleaseNotesController } from './ReleaseNotesController.js';

export class ReleaseNotesModule implements IContainerModule {
  applyTo(container: IContainer) {
    container.addRegistration(R.fromClass(GithubService));
    container.addRegistration(R.fromClass(ReleaseNotesController));
  }
}
