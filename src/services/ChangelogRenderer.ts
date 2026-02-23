import path from 'node:path';
import { ConventionalCommit } from '../models/ConventionalCommit';
import { NodeFileSystemService } from './NodeFileSystemService';
import { HandlebarsRenderService } from './HandlebarsRenderService';

export class ChangelogRenderer {
  private commits: ConventionalCommit[] = [];

  constructor(
    private readonly renderService: HandlebarsRenderService,
    private readonly fs: NodeFileSystemService,
  ) {}

  addLog(entry: ConventionalCommit): void {
    this.commits.push(entry);
  }

  render(options: { packageName: string; packageVersion: string; packagePath: string }): void {
    if (!this.commits.length) return;

    const changelogPath = path.resolve(options.packagePath, 'CHANGELOG.md');
    const existing = this.fs.fileExists(changelogPath) ? this.fs.readFile(changelogPath) : '';
    const content = this.renderService.render('templates/changelog.hbs', {
      commits: this.commits,
      packageName: options.packageName,
      existing,
    });

    this.fs.writeFile(changelogPath, content);
  }
}
