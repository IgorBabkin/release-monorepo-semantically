import 'reflect-metadata';

import { readFileSync } from 'node:fs';
import Handlebars from 'handlebars';
import { ConventionalCommit, filterCommitsByType, filterCommitsExcludingTypes } from '../domain/ConventionalCommit.js';
import { TemplateInvocationTargetException, TemplateMethodNotFunctionException } from '../exceptions/DomainException.js';
import { inject, register, SingleToken, singleton } from 'ts-ioc-container';
import { globalConfig } from '../domain/GlobalConfig.js';
import path from 'node:path';

export interface IRenderService {
  render(templatePath: string, data: object, options?: { cwd?: string }): string;
}

export const IRenderServiceKey = new SingleToken<IRenderService>('IRenderService');

@register(IRenderServiceKey, singleton())
export class HandlebarsRenderService implements IRenderService {
  constructor(@inject(globalConfig('cwd')) private readonly cwd: string) {
    this.registerNowHelper();
    this.registerHasBreakingChangesHelper();
    this.registerHasFeaturesHelper();
    this.registerFindFeaturesHelper();
    this.registerHasFixesHelper();
    this.registerFindFixesHelper();
    this.registerFindBreakingHelper();
    this.registerHasPerformanceHelper();
    this.registerFindPerformanceHelper();
    this.registerHasOthersHelper();
    this.registerFindOthersHelper();
    this.registerLookupHelper();
    this.registerCallHelper();
  }

  private resolveAbsolutePath(paths: string, options: { cwd?: string } = {}) {
    return path.resolve(options.cwd ?? this.cwd, paths);
  }

  render(templatePath: string, data: object, options?: { cwd?: string }): string {
    const source = readFileSync(this.resolveAbsolutePath(templatePath, options), 'utf-8');
    const template = Handlebars.compile(source);
    return template(data);
  }

  registerNowHelper(): void {
    Handlebars.registerHelper('now', () => new Date().toISOString().slice(0, 10));
  }

  registerHasBreakingChangesHelper(): void {
    Handlebars.registerHelper('hasBreakingChanges', (commits: ConventionalCommit[]) => commits.some((commit) => commit.isBreaking));
  }

  registerHasFeaturesHelper(): void {
    Handlebars.registerHelper('hasFeatures', (commits: ConventionalCommit[]) => filterCommitsByType(commits, 'feat').length > 0);
  }

  registerFindFeaturesHelper(): void {
    Handlebars.registerHelper('findFeatures', (commits: ConventionalCommit[]) => filterCommitsByType(commits, 'feat'));
  }

  registerHasFixesHelper(): void {
    Handlebars.registerHelper('hasFixes', (commits: ConventionalCommit[]) => filterCommitsByType(commits, 'fix').length > 0);
  }

  registerFindFixesHelper(): void {
    Handlebars.registerHelper('findFixes', (commits: ConventionalCommit[]) => filterCommitsByType(commits, 'fix'));
  }

  registerFindBreakingHelper(): void {
    Handlebars.registerHelper('findBreakingChanges', (commits: ConventionalCommit[]) => commits.filter((commit) => commit.isBreaking));
  }

  registerHasPerformanceHelper(): void {
    Handlebars.registerHelper('hasPerformance', (commits: ConventionalCommit[]) => filterCommitsByType(commits, 'perf').length > 0);
  }

  registerFindPerformanceHelper(): void {
    Handlebars.registerHelper('findPerformance', (commits: ConventionalCommit[]) => filterCommitsByType(commits, 'perf'));
  }

  registerHasOthersHelper(): void {
    Handlebars.registerHelper('hasOthers', (commits: ConventionalCommit[]) => filterCommitsExcludingTypes(commits, ['feat', 'fix', 'perf']).length > 0);
  }

  registerFindOthersHelper(): void {
    Handlebars.registerHelper('findOthers', (commits: ConventionalCommit[]) => filterCommitsExcludingTypes(commits, ['feat', 'fix', 'perf']));
  }

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
