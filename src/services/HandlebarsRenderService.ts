import 'reflect-metadata';

import { execute } from '../cli/execute.js';
import { readFileSync } from 'node:fs';
import Handlebars from 'handlebars';
import { ConventionalCommit, filterCommitsByType, filterCommitsExcludingTypes } from '../domain/ConventionalCommit.js';
import { TemplateInvocationTargetException, TemplateMethodNotFunctionException } from '../exceptions/DomainException.js';
import { inject, register, SingleToken, singleton } from 'ts-ioc-container';
import { onResolveOnce, resolved } from '../utils/ts-ioc-container.js';
import { globalConfig } from '../domain/GlobalConfig.js';
import path from 'node:path';

export interface IRenderService {
  render(templatePath: string, data: object, options?: { cwd?: string }): string;
}

export const IRenderServiceKey = new SingleToken<IRenderService>('IRenderService');

@register(IRenderServiceKey, singleton(), resolved())
export class HandlebarsRenderService implements IRenderService {
  constructor(@inject(globalConfig('cwd')) private readonly cwd: string) {}

  private resolveAbsolutePath(paths: string, options: { cwd?: string } = {}) {
    return path.resolve(options.cwd ?? this.cwd, paths);
  }

  render(templatePath: string, data: object, options?: { cwd?: string }): string {
    const source = readFileSync(this.resolveAbsolutePath(templatePath, options), 'utf-8');
    const template = Handlebars.compile(source);
    return template(data);
  }

  @onResolveOnce(execute())
  registerNowHelper(): void {
    Handlebars.registerHelper('now', () => new Date().toISOString().slice(0, 10));
  }

  @onResolveOnce(execute())
  registerHasBreakingChangesHelper(): void {
    Handlebars.registerHelper('hasBreakingChanges', (commits: ConventionalCommit[]) => commits.some((commit) => commit.isBreaking));
  }

  @onResolveOnce(execute())
  registerHasFeaturesHelper(): void {
    Handlebars.registerHelper('hasFeatures', (commits: ConventionalCommit[]) => filterCommitsByType(commits, 'feat').length > 0);
  }

  @onResolveOnce(execute())
  registerFindFeaturesHelper(): void {
    Handlebars.registerHelper('findFeatures', (commits: ConventionalCommit[]) => filterCommitsByType(commits, 'feat'));
  }

  @onResolveOnce(execute())
  registerHasFixesHelper(): void {
    Handlebars.registerHelper('hasFixes', (commits: ConventionalCommit[]) => filterCommitsByType(commits, 'fix').length > 0);
  }

  @onResolveOnce(execute())
  registerFindFixesHelper(): void {
    Handlebars.registerHelper('findFixes', (commits: ConventionalCommit[]) => filterCommitsByType(commits, 'fix'));
  }

  @onResolveOnce(execute())
  registerFindBreakingHelper(): void {
    Handlebars.registerHelper('findBreakingChanges', (commits: ConventionalCommit[]) => commits.filter((commit) => commit.isBreaking));
  }

  @onResolveOnce(execute())
  registerHasPerformanceHelper(): void {
    Handlebars.registerHelper('hasPerformance', (commits: ConventionalCommit[]) => filterCommitsByType(commits, 'perf').length > 0);
  }

  @onResolveOnce(execute())
  registerFindPerformanceHelper(): void {
    Handlebars.registerHelper('findPerformance', (commits: ConventionalCommit[]) => filterCommitsByType(commits, 'perf'));
  }

  @onResolveOnce(execute())
  registerHasOthersHelper(): void {
    Handlebars.registerHelper('hasOthers', (commits: ConventionalCommit[]) => filterCommitsExcludingTypes(commits, ['feat', 'fix', 'perf']).length > 0);
  }

  @onResolveOnce(execute())
  registerFindOthersHelper(): void {
    Handlebars.registerHelper('findOthers', (commits: ConventionalCommit[]) => filterCommitsExcludingTypes(commits, ['feat', 'fix', 'perf']));
  }

  @onResolveOnce(execute())
  registerLookupHelper(): void {
    Handlebars.registerHelper('lookup', (container: unknown, key: unknown) => {
      if (container instanceof Map) {
        return container.get(String(key));
      }
      if (container && typeof container === 'object') {
        return (container as Record<string, unknown>)[String(key)];
      }
      return undefined;
    });
  }

  @onResolveOnce(execute())
  registerCallHelper(): void {
    Handlebars.registerHelper('call', (target: unknown, methodName: unknown, ...args: unknown[]) => {
      const options = args.pop();
      if (!target || typeof target !== 'object') {
        throw new TemplateInvocationTargetException(String(methodName));
      }

      const method = (target as Record<string, unknown>)[String(methodName)];
      if (typeof method !== 'function') {
        throw new TemplateMethodNotFunctionException(String(methodName));
      }

      void options;
      return method.apply(target, args);
    });
  }
}
