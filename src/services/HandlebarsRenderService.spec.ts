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

  it('given no local template when rendering then it falls back to the package template directory', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'handlebars-render-service-'));
    tempRoots.push(root);

    const cwd = path.join(root, 'workspace');
    const packageRoot = path.join(root, 'package');
    mkdirSync(cwd, { recursive: true });
    mkdirSync(path.join(packageRoot, 'templates'), { recursive: true });
    writeFileSync(path.join(packageRoot, 'templates', 'release-commit-msg.hbs'), 'release {{value}}\n');

    const service = new HandlebarsRenderService(cwd, packageRoot);

    const rendered = service.render('templates/release-commit-msg.hbs', { value: 'ok' });

    expect(rendered).toBe('release ok\n');
  });
});
