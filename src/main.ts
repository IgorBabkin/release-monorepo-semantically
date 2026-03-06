import { MonorepoController } from './MonorepoController';
import { NodeFileSystemService } from './services/NodeFileSystemService';
import { GitService } from './services/GitService';
import { ChangelogRenderer } from './services/ChangelogRenderer';
import { HandlebarsRenderService } from './services/HandlebarsRenderService';
import { ReleaseCommit } from './services/ReleaseCommit';
import { PackageManager } from './services/PackageManager';
import { ConsoleLogger } from './services/ConsoleLogger';

export function runCli(cwd = process.cwd()): number {
  try {
    // Dependencies
    const fsService = new NodeFileSystemService();
    const vcs = new GitService();
    const renderService = new HandlebarsRenderService(cwd);
    const changelog = new ChangelogRenderer(renderService, fsService);
    const releaseCommit = new ReleaseCommit(vcs, renderService);
    const packageManager = new PackageManager();
    const controller = new MonorepoController(fsService, vcs, changelog, releaseCommit, packageManager, new ConsoleLogger('Release'));

    controller.discoverRootPackageJSON();
    controller.discoverPackages();
    controller.release();

    return 0;
  } catch (error) {
    console.error(error);
    return 1;
  }
}

if (require.main === module) {
  process.exit(runCli());
}
