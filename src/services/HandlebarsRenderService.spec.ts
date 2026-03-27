import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { HandlebarsRenderService } from './HandlebarsRenderService';

describe('HandlebarsRenderService.render', () => {
  const tempRoots: string[] = [];

  afterEach(() => {
    for (const root of tempRoots.splice(0)) {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('given a cwd override when rendering then the template is resolved from that directory', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'handlebars-render-service-'));
    tempRoots.push(root);

    const cwd = path.join(root, 'workspace');
    mkdirSync(cwd, { recursive: true });
    mkdirSync(path.join(cwd, 'templates'), { recursive: true });
    writeFileSync(path.join(cwd, 'templates', 'release-commit-msg.hbs'), 'release {{value}}\n');

    const service = new HandlebarsRenderService(cwd);

    const rendered = service.render('templates/release-commit-msg.hbs', { value: 'ok' }, { cwd });

    expect(rendered).toBe('release ok\n');
  });

  it('given no cwd override when rendering then the configured cwd is used', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'handlebars-render-service-'));
    tempRoots.push(root);

    mkdirSync(path.join(root, 'templates'), { recursive: true });
    writeFileSync(path.join(root, 'templates', 'release-commit-msg.hbs'), 'release {{value}}\n');

    const service = new HandlebarsRenderService(root);

    expect(service.render('templates/release-commit-msg.hbs', { value: 'ok' })).toBe('release ok\n');
  });
});
