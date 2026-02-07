import {readFileSync} from 'node:fs';
import Handlebars from 'handlebars';
import {RenderService} from './RenderService';

export class HandlebarsRenderService implements RenderService {
    render(templatePath: string, data: Record<string, any>): string {
        const source = readFileSync(templatePath, 'utf-8');
        const template = Handlebars.compile(source);
        return template(data);
    }
}
