import { existsSync, readFileSync } from 'node:fs';
import Handlebars from 'handlebars';
import path from 'node:path';

export class HandlebarsRenderService {
  constructor(
    private basePath: string,
    private fallbackBasePath?: string,
  ) {}

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
}
