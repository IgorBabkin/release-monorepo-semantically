import { MonorepoController } from './MonorepoController';
import { NodeFileSystemService } from './services/NodeFileSystemService';
import { GitService } from './services/GitService';
import { ChangelogRenderer } from './services/ChangelogRenderer';
import { HandlebarsRenderService } from './services/HandlebarsRenderService';
import { ReleaseCommit } from './services/ReleaseCommit';
import { PackageManager } from './services/PackageManager';

// Dependencies
const fsService = new NodeFileSystemService();
const vcs = new GitService();
const renderService = new HandlebarsRenderService(process.cwd());
const changelog = new ChangelogRenderer(renderService, fsService);
const releaseCommit = new ReleaseCommit(vcs, renderService);
const packageManager = new PackageManager();

const controller = new MonorepoController(fsService, vcs, changelog, releaseCommit, packageManager);

try {
  // const args = process.argv.slice(2);
  controller.discoverRootPackageJSON();
  controller.discoverPackages();
  controller.release();
} catch (error) {
  console.error(error);
}
