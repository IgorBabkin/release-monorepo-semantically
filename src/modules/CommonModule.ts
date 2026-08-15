import { type IContainer, type IContainerModule, Registration as R } from 'ts-ioc-container';
import { NodeFileSystemService } from '../services/NodeFileSystemService.js';
import { ExceptionHandler } from '../exceptions/ExceptionHandler.js';
import { ConsoleLogger } from '../services/ConsoleLogger.js';
import { HandlebarsRenderService } from '../services/HandlebarsRenderService.js';
import { GlobalConfigKey } from '../domain/GlobalConfig.js';
import { PluginsConfigService } from '../services/PluginsConfigService.js';

interface CommonModuleOptions {
  cwd: string;
}

export class CommonModule implements IContainerModule {
  constructor(private readonly options: CommonModuleOptions) {}

  applyTo(container: IContainer): void {
    container
      .addRegistration(R.fromValue(this.options).bindTo(GlobalConfigKey))

      .addRegistration(R.fromClass(PluginsConfigService))
      .addRegistration(R.fromClass(NodeFileSystemService))
      .addRegistration(R.fromClass(ExceptionHandler))
      .addRegistration(R.fromClass(ConsoleLogger))
      .addRegistration(R.fromClass(HandlebarsRenderService));
  }
}
