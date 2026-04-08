import 'reflect-metadata';
import { AddOnConstructHookModule, Container, Provider } from 'ts-ioc-container';
import { CommonModule } from './modules/CommonModule';
import { VCSPluginModule } from './plugins/vcs/VCSPluginModule';
import { ReleaseNotesPluginModule } from './plugins/releaseNotes/ReleaseNotesPluginModule';
import { PackageManagerPluginModule } from './plugins/packageManager/PackageManagerPluginModule';
import { PackageJsonPluginModule } from './plugins/packageJson/PackageJsonPluginModule';
import { ChangelogModule } from './plugins/changelog/ChangelogModule';
import { ReportModule } from './plugins/report/ReportModule';
import { Application, SetupModule } from 'ib-commander';

export function runCli(args: string[], cwd = process.cwd()): number {
  const container = new Container({ tags: ['root'] })
    .useModule(new AddOnConstructHookModule())
    .useModule(new SetupModule())
    .useModule(new CommonModule({ cwd }))
    .useModule(new ReportModule())
    .useModule(new VCSPluginModule())
    .useModule(new ReleaseNotesPluginModule())
    .useModule(new PackageManagerPluginModule())
    .useModule(new ChangelogModule())
    .useModule(new PackageJsonPluginModule());

  container.register('args', Provider.fromValue(args));

  const app = Application.bootstrap(container);
  app.run();
  return 0;
}

export default runCli;

if (require.main === module) {
  process.exit(runCli(process.argv));
}
