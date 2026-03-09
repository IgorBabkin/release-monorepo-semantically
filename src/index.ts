import 'reflect-metadata';
import { IExceptionHandlerKey } from './exceptions/ExceptionHandler';
import { AddOnConstructHookModule, Container } from 'ts-ioc-container';
import { CommonModule } from './modules/CommonModule';
import { App } from './App';
import { VCSPluginModule } from './plugins/vcs/VCSPluginModule';
import { ReleaseNotesPluginModule } from './plugins/releaseNotes/ReleaseNotesPluginModule';
import { PackageManagerPluginModule } from './plugins/packageManager/PackageManagerPluginModule';
import { PackageJsonPluginModule } from './plugins/packageJson/PackageJsonPluginModule';
import { ChangelogPluginModule } from './plugins/changelog/ChangelogPluginModule';

export function runCli(cwd = process.cwd()): number {
  const container = new Container({ tags: ['root'] })
    .useModule(new AddOnConstructHookModule())
    .useModule(new CommonModule({ cwd }))
    .useModule(new VCSPluginModule())
    .useModule(new ReleaseNotesPluginModule())
    .useModule(new PackageManagerPluginModule())
    .useModule(new ChangelogPluginModule())
    .useModule(new PackageJsonPluginModule());
  const exceptionHandler = IExceptionHandlerKey.resolve(container);
  const app = container.resolve(App);

  try {
    app.run();
    return 0;
  } catch (error) {
    exceptionHandler.handle(error);
    return 1;
  } finally {
    container.dispose();
  }
}

export default runCli;

if (require.main === module) {
  process.exit(runCli());
}
