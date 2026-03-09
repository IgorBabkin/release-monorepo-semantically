import { type IContainer, type IContainerModule, Registration as R } from 'ts-ioc-container';
import { CliOptionsService } from '../services/CliOptionsService';
import { NodeFileSystemService } from '../services/NodeFileSystemService';
import { ExceptionHandler } from '../exceptions/ExceptionHandler';
import { PNPMPackageManager } from '../plugins/packageManager/services/PNPMPackageManager';
import { ConsoleLogger } from '../services/ConsoleLogger';
import { HandlebarsRenderService } from '../services/HandlebarsRenderService';
import { GlobalConfigKey } from '../models/GlobalConfig';
import { PluginsConfigService } from '../models/PluginConfig';

interface CommonModuleOptions {
  cwd: string;
}

export class CommonModule implements IContainerModule {
  constructor(private readonly options: CommonModuleOptions) {}

  applyTo(container: IContainer): void {
    container
      .addRegistration(R.fromValue(this.options).bindTo(GlobalConfigKey))

      .addRegistration(R.fromClass(PluginsConfigService))
      .addRegistration(R.fromClass(CliOptionsService))
      .addRegistration(R.fromClass(NodeFileSystemService))
      .addRegistration(R.fromClass(ExceptionHandler))
      .addRegistration(R.fromClass(PNPMPackageManager))
      .addRegistration(R.fromClass(ConsoleLogger))
      .addRegistration(R.fromClass(HandlebarsRenderService));
  }
}
