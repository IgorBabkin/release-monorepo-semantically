#!/usr/bin/env node

import { runCli } from '../dist/index.js';

process.exit(runCli(process.argv.slice(2)));
