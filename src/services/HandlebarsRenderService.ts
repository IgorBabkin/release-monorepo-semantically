import { readFileSync } from 'node:fs';
import Handlebars from 'handlebars';
import path from 'node:path';

export class HandlebarsRenderService {
  constructor(private basePath: string) {}

  render(templatePath: string, data: Record<string, unknown>): string {
    const resolvedTemplatePath = path.isAbsolute(templatePath) ? templatePath : path.resolve(this.basePath, templatePath);
    const source = readFileSync(resolvedTemplatePath, 'utf-8');
    const template = Handlebars.compile(source);
    return template(data);
  }
}
