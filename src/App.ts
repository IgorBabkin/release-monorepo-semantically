import { inject } from 'ts-ioc-container';
import { Controller } from './Controller';
import { ICliOptionsService, ICliOptionsServiceKey } from './services/CliOptionsService';

export class App {
  constructor(
    @inject(Controller) private readonly controller: Controller,
    @inject(ICliOptionsServiceKey) private readonly cliOptionsService: ICliOptionsService,
  ) {}

  run() {
    const cliOptions = this.cliOptionsService.parse();

    if (cliOptions.help) {
      return;
    }

    this.controller.discoverPackages();
    this.controller.release();
  }
}
