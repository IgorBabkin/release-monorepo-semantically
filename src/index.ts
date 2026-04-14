import 'reflect-metadata';
import { AddOnConstructHookModule, Container, Provider } from 'ts-ioc-container';
import { CommonModule } from './modules/CommonModule';
import { VCSModule } from './features/vcs/VCSModule';
import { ReleaseNotesModule } from './features/releaseNotes/ReleaseNotesModule';
import { PackageManagerModule } from './features/packageManager/PackageManagerModule';
import { PackageJsonModule } from './features/packageJson/PackageJsonModule';
import { ChangelogModule } from './features/changelog/ChangelogModule';
import { ReportModule } from './features/report/ReportModule';
import { Application, SetupModule } from 'ib-commander';

export function runCli(args: string[], cwd = process.cwd()): number {
  const container = new Container({ tags: ['root'] })
    .useModule(new AddOnConstructHookModule())
    .useModule(new SetupModule())
    .useModule(new CommonModule({ cwd }))
    .useModule(new ReportModule())
    .useModule(new VCSModule())
    .useModule(new ReleaseNotesModule())
    .useModule(new PackageManagerModule())
    .useModule(new ChangelogModule())
    .useModule(new PackageJsonModule());

  container.register('args', Provider.fromValue(args));

  const app = Application.bootstrap(container);
  app.run();
  return 0;
}

export default runCli;

if (require.main === module) {
  process.exit(runCli(process.argv));
}
