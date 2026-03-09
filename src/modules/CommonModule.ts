import { args, type IContainer, type IContainerModule, Registration as R } from 'ts-ioc-container';
import { CliOptionsService } from '../services/CliOptionsService';
import { NodeFileSystemService } from '../services/NodeFileSystemService';
import { GitService } from '../plugins/vcs/services/GitService';
import { ExceptionHandler } from '../exceptions/ExceptionHandler';
import { PNPMPackageManager } from '../plugins/packageManager/services/PNPMPackageManager';
import { GithubService } from '../plugins/releaseNotes/services/GithubService';
import { ConsoleLogger, ILoggerTopicKey } from '../services/ConsoleLogger';
import { ReleaseNotesPlugin } from '../plugins/releaseNotes/ReleaseNotesPlugin';
import { PackageManagerPlugin } from '../plugins/packageManager/PackageManagerPlugin';
import { ChangelogPlugin } from '../plugins/changelog/ChangelogPlugin';
import { PackageJsonPlugin } from '../plugins/packageJson/PackageJsonPlugin';
import { HandlebarsRenderService } from '../services/HandlebarsRenderService';
import { GlobalConfigKey } from '../models/GlobalConfig';

interface CommonModuleOptions {
  cwd: string;
}

export class CommonModule implements IContainerModule {
  constructor(private readonly options: CommonModuleOptions) {}

  applyTo(container: IContainer): void {
    container
      .addRegistration(R.fromValue(this.options).bindTo(GlobalConfigKey))

      .addRegistration(R.fromClass(PackageManagerPlugin))
      .addRegistration(R.fromClass(ChangelogPlugin))
      .addRegistration(R.fromClass(PackageJsonPlugin))

      .addRegistration(R.fromClass(CliOptionsService))
      .addRegistration(R.fromClass(NodeFileSystemService))
      .addRegistration(R.fromClass(ExceptionHandler))
      .addRegistration(R.fromClass(PNPMPackageManager))
      .addRegistration(R.fromClass(ConsoleLogger))
      .addRegistration(R.fromClass(HandlebarsRenderService));
  }
}
