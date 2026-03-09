import { IContainer, IContainerModule, Registration as R } from 'ts-ioc-container';
import { GithubService } from './services/GithubService';
import { ReleaseNotesPlugin } from './ReleaseNotesPlugin';

export class ReleaseNotesPluginModule implements IContainerModule {
  applyTo(container: IContainer) {
    container.addRegistration(R.fromClass(GithubService));
    container.addRegistration(R.fromClass(ReleaseNotesPlugin));
  }
}
