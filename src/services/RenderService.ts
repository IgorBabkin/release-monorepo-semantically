export interface RenderService {
    render(templatePath: string, data: Record<string, any>): string;
}
