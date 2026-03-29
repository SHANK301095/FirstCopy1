/**
 * EA Manager Store
 * Manages EAs, presets, and compile state in Dexie
 */

import { db } from '@/db';
import { v4 as uuidv4 } from 'uuid';
import type { EAInfo, EAPreset, EAInput, CompileResult } from '@/types/electron-api';

// ============= Dexie Schema Extension =============

// Note: These tables should be added to db/index.ts schema
// For now, we use localStorage as fallback

interface EAStore {
  eas: EAInfo[];
  presets: Record<string, EAPreset[]>;
  compileResults: Record<string, CompileResult>;
}

const STORE_KEY = 'mt5-ea-store';

function getStore(): EAStore {
  const stored = localStorage.getItem(STORE_KEY);
  if (stored) {
    return JSON.parse(stored);
  }
  return { eas: [], presets: {}, compileResults: {} };
}

function saveStore(store: EAStore): void {
  localStorage.setItem(STORE_KEY, JSON.stringify(store));
}

// ============= EA Management =============

export async function listEAs(): Promise<EAInfo[]> {
  const store = getStore();
  return store.eas;
}

export async function getEA(id: string): Promise<EAInfo | null> {
  const store = getStore();
  return store.eas.find(ea => ea.id === id) || null;
}

export async function addEA(ea: Omit<EAInfo, 'id'>): Promise<EAInfo> {
  const store = getStore();
  const newEA: EAInfo = {
    ...ea,
    id: uuidv4(),
  };
  store.eas.push(newEA);
  saveStore(store);
  
  await db.log('info', 'EA imported', { name: ea.name });
  return newEA;
}

export async function updateEA(id: string, updates: Partial<EAInfo>): Promise<EAInfo | null> {
  const store = getStore();
  const index = store.eas.findIndex(ea => ea.id === id);
  if (index === -1) return null;
  
  store.eas[index] = { ...store.eas[index], ...updates };
  saveStore(store);
  return store.eas[index];
}

export async function deleteEA(id: string): Promise<boolean> {
  const store = getStore();
  const index = store.eas.findIndex(ea => ea.id === id);
  if (index === -1) return false;
  
  const name = store.eas[index].name;
  store.eas.splice(index, 1);
  delete store.presets[id];
  delete store.compileResults[id];
  saveStore(store);
  
  await db.log('info', 'EA deleted', { name });
  return true;
}

// ============= Preset Management =============

export async function listPresets(eaId: string): Promise<EAPreset[]> {
  const store = getStore();
  return store.presets[eaId] || [];
}

export async function addPreset(eaId: string, preset: Omit<EAPreset, 'id' | 'createdAt'>): Promise<EAPreset> {
  const store = getStore();
  if (!store.presets[eaId]) {
    store.presets[eaId] = [];
  }
  
  const newPreset: EAPreset = {
    ...preset,
    id: uuidv4(),
    createdAt: Date.now(),
  };
  store.presets[eaId].push(newPreset);
  saveStore(store);
  
  return newPreset;
}

export async function deletePreset(eaId: string, presetId: string): Promise<boolean> {
  const store = getStore();
  if (!store.presets[eaId]) return false;
  
  const index = store.presets[eaId].findIndex(p => p.id === presetId);
  if (index === -1) return false;
  
  store.presets[eaId].splice(index, 1);
  saveStore(store);
  return true;
}

// ============= Compile Results =============

export async function saveCompileResult(eaId: string, result: CompileResult): Promise<void> {
  const store = getStore();
  store.compileResults[eaId] = result;
  
  // Update EA compiled status
  const eaIndex = store.eas.findIndex(ea => ea.id === eaId);
  if (eaIndex !== -1) {
    store.eas[eaIndex].compiled = result.success;
    store.eas[eaIndex].lastCompiled = Date.now();
  }
  
  saveStore(store);
  
  await db.log(result.success ? 'info' : 'error', 'EA compiled', {
    eaId,
    success: result.success,
    errors: result.errors.length,
    warnings: result.warnings.length,
  });
}

export async function getCompileResult(eaId: string): Promise<CompileResult | null> {
  const store = getStore();
  return store.compileResults[eaId] || null;
}

// ============= Parse .SET File =============

export function parseSetFile(content: string): Record<string, unknown> {
  const params: Record<string, unknown> = {};
  const lines = content.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith(';')) continue;
    
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      const [, key, value] = match;
      const trimmedKey = key.trim();
      const trimmedValue = value.trim();
      
      // Parse value type
      if (trimmedValue === 'true' || trimmedValue === 'false') {
        params[trimmedKey] = trimmedValue === 'true';
      } else if (/^-?\d+$/.test(trimmedValue)) {
        params[trimmedKey] = parseInt(trimmedValue, 10);
      } else if (/^-?\d+\.\d+$/.test(trimmedValue)) {
        params[trimmedKey] = parseFloat(trimmedValue);
      } else {
        params[trimmedKey] = trimmedValue;
      }
    }
  }
  
  return params;
}

// ============= Parse MQL5 Input Schema =============

export function parseMQL5Inputs(code: string): Record<string, EAInput> {
  const inputs: Record<string, EAInput> = {};
  
  // Match input declarations
  const inputRegex = /input\s+(int|double|bool|string|ENUM_\w+)\s+(\w+)\s*=\s*([^;]+);(?:\s*\/\/\s*(.*))?/g;
  
  let match;
  while ((match = inputRegex.exec(code)) !== null) {
    const [, type, name, defaultValue, comment] = match;
    
    let inputType: EAInput['type'] = 'string';
    let parsedDefault: unknown = defaultValue.trim();
    
    switch (type.toLowerCase()) {
      case 'int':
        inputType = 'int';
        parsedDefault = parseInt(defaultValue, 10) || 0;
        break;
      case 'double':
        inputType = 'double';
        parsedDefault = parseFloat(defaultValue) || 0;
        break;
      case 'bool':
        inputType = 'bool';
        parsedDefault = defaultValue.trim().toLowerCase() === 'true';
        break;
      default:
        if (type.startsWith('ENUM_')) {
          inputType = 'enum';
        }
        break;
    }
    
    inputs[name] = {
      name,
      type: inputType,
      default: parsedDefault,
    };
    
    // Parse range from comment if present (e.g., // [1-100, step 5])
    if (comment) {
      const rangeMatch = comment.match(/\[(\d+)-(\d+)(?:,\s*step\s*(\d+))?\]/);
      if (rangeMatch) {
        inputs[name].min = parseInt(rangeMatch[1], 10);
        inputs[name].max = parseInt(rangeMatch[2], 10);
        if (rangeMatch[3]) {
          inputs[name].step = parseInt(rangeMatch[3], 10);
        }
      }
    }
  }
  
  return inputs;
}

// ============= Generate .SET File =============

export function generateSetFile(params: Record<string, unknown>): string {
  const lines: string[] = [
    '; Generated by MMC',
    `; Date: ${new Date().toISOString()}`,
    '',
  ];
  
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === 'boolean') {
      lines.push(`${key}=${value ? 'true' : 'false'}`);
    } else {
      lines.push(`${key}=${value}`);
    }
  }
  
  return lines.join('\n');
}
