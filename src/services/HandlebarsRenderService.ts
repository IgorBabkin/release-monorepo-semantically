import { readFileSync } from 'node:fs';
import Handlebars from 'handlebars';
import { RenderService } from './RenderService';
import {bindTo, register} from "ts-ioc-container";
import { RenderServiceKey } from './RenderService';

@register(bindTo(RenderServiceKey))
export class HandlebarsRenderService implements RenderService {
  render(templatePath: string, data: Record<string, unknown>): string {
    const source = readFileSync(templatePath, 'utf-8');
    const template = Handlebars.compile(source);
    return template(data);
  }
}
