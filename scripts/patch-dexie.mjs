#!/usr/bin/env node
/**
 * Patch dexie.d.ts to fix TS1540 error in TypeScript 5.5+
 * Replaces `declare module Dexie` with `declare namespace Dexie`
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const filePath = resolve('node_modules/dexie/dist/dexie.d.ts');

if (existsSync(filePath)) {
  let content = readFileSync(filePath, 'utf-8');
  const patched = content.replace(/declare module Dexie/g, 'declare namespace Dexie');
  if (patched !== content) {
    writeFileSync(filePath, patched, 'utf-8');
    console.log('[patch-dexie] Fixed TS1540: replaced declare module → declare namespace');
  }
}
