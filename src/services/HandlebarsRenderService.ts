import { existsSync, readFileSync } from 'node:fs';
import Handlebars from 'handlebars';
import path from 'node:path';
import { ConventionalCommit } from '../models/ConventionalCommit';

let helpersRegistered = false;

export class HandlebarsRenderService {
  constructor(
    private basePath: string,
    private fallbackBasePath?: string,
  ) {
    this.registerHelpers();
  }

  render(templatePath: string, data: Record<string, unknown>): string {
    const resolvedTemplatePath = this.resolveTemplatePath(templatePath);
    const source = readFileSync(resolvedTemplatePath, 'utf-8');
    const template = Handlebars.compile(source);
    return template(data);
  }

  private resolveTemplatePath(templatePath: string): string {
    if (path.isAbsolute(templatePath)) {
      return templatePath;
    }

    const localTemplatePath = path.resolve(this.basePath, templatePath);
    if (existsSync(localTemplatePath) || !this.fallbackBasePath) {
      return localTemplatePath;
    }

    return path.resolve(this.fallbackBasePath, templatePath);
  }

  private registerHelpers(): void {
    if (helpersRegistered) {
      return;
    }

    const filterByType = (commits: ConventionalCommit[], type: string): ConventionalCommit[] => commits.filter((commit) => commit.type === type);

    Handlebars.registerHelper('now', () => new Date().toISOString().slice(0, 10));
    Handlebars.registerHelper('hasBreakingChanges', (commits: ConventionalCommit[]) => commits.some((commit) => commit.isBreaking));
    Handlebars.registerHelper('findBreakingChanges', (commits: ConventionalCommit[]) => commits.filter((commit) => commit.isBreaking));
    Handlebars.registerHelper('hasFeatures', (commits: ConventionalCommit[]) => filterByType(commits, 'feat').length > 0);
    Handlebars.registerHelper('findFeatures', (commits: ConventionalCommit[]) => filterByType(commits, 'feat'));
    Handlebars.registerHelper('hasFixes', (commits: ConventionalCommit[]) => filterByType(commits, 'fix').length > 0);
    Handlebars.registerHelper('findFixes', (commits: ConventionalCommit[]) => filterByType(commits, 'fix'));
    Handlebars.registerHelper('hasPerfomance', (commits: ConventionalCommit[]) => filterByType(commits, 'perf').length > 0);
    Handlebars.registerHelper('findPerfomance', (commits: ConventionalCommit[]) => filterByType(commits, 'perf'));
    Handlebars.registerHelper('lookup', (container: unknown, key: unknown) => {
      if (container instanceof Map) {
        return container.get(String(key));
      }
      if (container && typeof container === 'object') {
        return (container as Record<string, unknown>)[String(key)];
      }
      return undefined;
    });
    Handlebars.registerHelper('call', (target: unknown, methodName: unknown, ...args: unknown[]) => {
      const options = args.pop();
      if (!target || typeof target !== 'object') {
        throw new Error(`Cannot call method ${String(methodName)} on non-object target`);
      }

      const method = (target as Record<string, unknown>)[String(methodName)];
      if (typeof method !== 'function') {
        throw new Error(`Method ${String(methodName)} is not a function`);
      }

      void options;
      return method.apply(target, args);
    });

    helpersRegistered = true;
  }
}
