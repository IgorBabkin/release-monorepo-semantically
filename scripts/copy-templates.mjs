#!/usr/bin/env node
// tsc only emits .ts files, so the default Handlebars templates that live next
// to their controllers have to be copied into dist manually. Without this the
// packaged CLI has no templates at all and every default render throws ENOENT.
import { copyFileSync, globSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const templates = globSync('src/**/*.hbs');

for (const template of templates) {
  const destination = path.join('dist', path.relative('src', template));
  mkdirSync(path.dirname(destination), { recursive: true });
  copyFileSync(template, destination);
}

console.log(`copied ${templates.length} template(s) into dist/`);
