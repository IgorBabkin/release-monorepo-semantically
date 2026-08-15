import 'reflect-metadata';
import { AddOnConstructHookModule, Container } from 'ts-ioc-container';
import { CommonModule } from './modules/CommonModule.js';
import { VCSModule } from './features/vcs/VCSModule.js';
import { ReleaseNotesModule } from './features/releaseNotes/ReleaseNotesModule.js';
import { PackageManagerModule } from './features/packageManager/PackageManagerModule.js';
import { PackageJsonModule } from './features/packageJson/PackageJsonModule.js';
import { ChangelogModule } from './features/changelog/ChangelogModule.js';
import { ReportModule } from './features/report/ReportModule.js';
import { Application } from './cli/Application.js';

export function runCli(args: string[], cwd = process.cwd()): number {
  const container = new Container({ tags: ['root'] })
    .useModule(new AddOnConstructHookModule())
    .useModule(new CommonModule({ cwd }))
    .useModule(new ReportModule())
    .useModule(new VCSModule())
    .useModule(new ReleaseNotesModule())
    .useModule(new PackageManagerModule())
    .useModule(new ChangelogModule())
    .useModule(new PackageJsonModule());

  const app = Application.bootstrap(container);
  app.run(...args);

  // Application swallows errors into its error handler, which records the
  // failure as a non-zero process.exitCode.
  return Number(process.exitCode ?? 0);
}

export default runCli;
