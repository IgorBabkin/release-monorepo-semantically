import { SingleToken } from "ts-ioc-container";

export interface RenderService {
  render(templatePath: string, data: Record<string, unknown>): string;
}

export const RenderServiceKey = new SingleToken<RenderService>('RenderService');