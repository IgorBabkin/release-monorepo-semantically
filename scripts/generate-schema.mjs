#!/usr/bin/env node
// Emits the JSON Schema for .release.json (and the root package.json "release"
// section) from the compiled zod config schemas, so editors and code agents can
// validate and autocomplete config against exactly what the CLI accepts.
import { writeFileSync } from 'node:fs';
import { releaseConfigJsonSchema } from '../dist/schema/releaseConfigSchema.js';

writeFileSync('dist/release.schema.json', `${JSON.stringify(releaseConfigJsonSchema(), null, 2)}\n`);

console.log('wrote dist/release.schema.json');
