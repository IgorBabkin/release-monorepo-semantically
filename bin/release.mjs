#!/usr/bin/env node

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { runCli } = require('../dist/index.js');

process.exit(runCli());
