import path from 'node:path';
import { ConventionalCommit } from '../models/ConventionalCommit';
import { NodeFileSystemService } from './NodeFileSystemService';
import { HandlebarsRenderService } from './HandlebarsRenderService';

interface DependencyVersionChange {
  packageName: string;
  oldVersion: string;
  newVersion: string;
}

interface RenderOptions {
  packageName: string;
  packageVersion: string;
  previousVersion?: string;
  packagePath: string;
  dependencyUpdates?: DependencyVersionChange[];
}

export class ChangelogRenderer {
  private commits: ConventionalCommit[] = [];
  private readonly changelogTemplatePath: string;

  constructor(
    private readonly renderService: HandlebarsRenderService,
    private readonly fs: NodeFileSystemService,
    changelogTemplatePath = 'templates/changelog.hbs',
  ) {
    this.changelogTemplatePath = changelogTemplatePath;
  }

  addLog(entry: ConventionalCommit): void {
    this.commits.push(entry);
  }

  render(options: RenderOptions): void {
    const packageCommits = this.commits;
    this.commits = [];

    if (!packageCommits.length && (!options.dependencyUpdates || options.dependencyUpdates.length === 0)) {
      return;
    }

    const changelogPath = path.resolve(options.packagePath, 'CHANGELOG.md');
    const existing = this.fs.fileExists(changelogPath) ? this.fs.readFile(changelogPath) : '';

    const breakingChanges = packageCommits.filter((commit) => commit.isBreaking);
    const features = packageCommits.filter((commit) => commit.type === 'feat');
    const fixes = packageCommits.filter((commit) => commit.type === 'fix');
    const performance = packageCommits.filter((commit) => commit.type === 'perf');

    const content = this.renderService.render(this.changelogTemplatePath, {
      entry: {
        version: options.packageVersion,
        oldVersion: options.previousVersion ?? options.packageVersion,
        date: new Date().toISOString().slice(0, 10),
        breakingChanges,
        features,
        fixes,
        performance,
        dependencyUpdates: options.dependencyUpdates ?? [],
      },
      packageName: options.packageName,
      existing,
    });

    this.fs.writeFile(changelogPath, content);
  }
}
