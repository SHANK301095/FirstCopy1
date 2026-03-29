/**
 * Streaming CSV Importer
 * Memory-efficient CSV parsing with chunked ArrayBuffer storage
 * Prevents RAM bombs on large files
 */

import Papa from "papaparse";

export type OHLCVRow = {
  ts: number;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
};

export type ImportPolicies = {
  duplicatePolicy: "keep-first" | "keep-last" | "drop";
  missingPolicy: "allow" | "drop";
};

export type ImportProgress = {
  rowsParsed: number;
  rowsAccepted: number;
  chunkIndex: number;
};

export type ImportStats = {
  rowsParsed: number;
  rowsAccepted: number;
  nanPct: number;
  dupsPct: number;
  gapsPct: number;
  inferredTimeframeMs: number | null;
  firstTs: number | null;
  lastTs: number | null;
};

function toNum(x: unknown): number {
  const n = Number(String(x ?? "").replace(/,/g, ""));
  return Number.isFinite(n) ? n : NaN;
}

function parseTs(x: unknown): number {
  const raw = String(x ?? "").trim();
  if (!raw) return NaN;
  const asNum = Number(raw);
  if (Number.isFinite(asNum)) {
    // If seconds epoch (10 digits)
    if (asNum > 1e9 && asNum < 1e12) return asNum * 1000;
    return asNum; // ms epoch
  }
  const t = Date.parse(raw);
  return Number.isFinite(t) ? t : NaN;
}

/**
 * Pack OHLCV rows into compact ArrayBuffer
 * Layout per row: ts(f64), o(f64), h(f64), l(f64), c(f64), v(f64) = 48 bytes
 */
export function packChunk(rows: OHLCVRow[]): ArrayBuffer {
  const buf = new ArrayBuffer(rows.length * 6 * 8);
  const view = new Float64Array(buf);
  let i = 0;
  for (const r of rows) {
    view[i++] = r.ts;
    view[i++] = r.o;
    view[i++] = r.h;
    view[i++] = r.l;
    view[i++] = r.c;
    view[i++] = r.v;
  }
  return buf;
}

/**
 * Unpack ArrayBuffer back to OHLCV rows
 */
export function unpackChunk(buf: ArrayBuffer): OHLCVRow[] {
  const view = new Float64Array(buf);
  const rows: OHLCVRow[] = [];
  for (let i = 0; i < view.length; i += 6) {
    rows.push({
      ts: view[i],
      o: view[i + 1],
      h: view[i + 2],
      l: view[i + 3],
      c: view[i + 4],
      v: view[i + 5],
    });
  }
  return rows;
}

export interface StreamCsvOptions {
  requiredColumns: { ts: string; o: string; h: string; l: string; c: string; v: string };
  chunkRows: number; // e.g. 50_000
  policies: ImportPolicies;
  onChunk: (chunkIndex: number, rows: OHLCVRow[], packed: ArrayBuffer) => Promise<void>;
  onProgress: (p: ImportProgress) => void;
  onStats: (finalStats: ImportStats) => void;
}

export async function streamCsvFile(file: File, opts: StreamCsvOptions): Promise<void> {
  const { requiredColumns, chunkRows, policies, onChunk, onProgress, onStats } = opts;

  let rowsParsed = 0;
  let rowsAccepted = 0;
  let lastTs: number | null = null;
  let firstTs: number | null = null;
  let nanCount = 0;
  let dupsCount = 0;
  let gapsCount = 0;

  const deltas: number[] = [];
  const seenTs = new Set<number>();
  let buffer: OHLCVRow[] = [];
  let chunkIndex = 0;

  await new Promise<void>((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      dynamicTyping: false,
      skipEmptyLines: true,
      worker: true,
      chunkSize: 1024 * 1024, // 1MB chunks
      chunk: async (results) => {
        try {
          const data = results.data as Record<string, string>[];
          for (const row of data) {
            rowsParsed++;

            const ts = parseTs(row[requiredColumns.ts]);
            const o = toNum(row[requiredColumns.o]);
            const h = toNum(row[requiredColumns.h]);
            const l = toNum(row[requiredColumns.l]);
            const c = toNum(row[requiredColumns.c]);
            const v = toNum(row[requiredColumns.v]);

            if (!Number.isFinite(ts) || !Number.isFinite(o) || !Number.isFinite(h) || 
                !Number.isFinite(l) || !Number.isFinite(c) || !Number.isFinite(v)) {
              nanCount++;
              if (policies.missingPolicy === "drop") continue;
            }

            // Handle duplicates
            if (seenTs.has(ts)) {
              dupsCount++;
              if (policies.duplicatePolicy === "drop") continue;
              if (policies.duplicatePolicy === "keep-first") continue;
              // keep-last: allow overwrite
            }
            seenTs.add(ts);

            if (firstTs == null) firstTs = ts;
            if (lastTs != null) {
              const d = ts - lastTs;
              if (d > 0) deltas.push(d);
            }
            lastTs = ts;

            buffer.push({ ts, o, h, l, c, v });
            rowsAccepted++;

            if (buffer.length >= chunkRows) {
              const packed = packChunk(buffer);
              const localRows = [...buffer];
              buffer = [];
              const myChunk = chunkIndex++;
              onProgress({ rowsParsed, rowsAccepted, chunkIndex: myChunk });
              await onChunk(myChunk, localRows, packed);
            }
          }
        } catch (e) {
          reject(e);
        }
      },
      complete: async () => {
        try {
          // Flush remaining buffer
          if (buffer.length) {
            const packed = packChunk(buffer);
            const myChunk = chunkIndex++;
            onProgress({ rowsParsed, rowsAccepted, chunkIndex: myChunk });
            await onChunk(myChunk, buffer, packed);
          }

          // Infer timeframe: median of deltas
          let inferred: number | null = null;
          if (deltas.length) {
            const s = deltas.filter((x) => x > 0).sort((a, b) => a - b);
            inferred = s[Math.floor(s.length / 2)] ?? null;
          }

          // Count gaps (delta > 1.5x inferred)
          if (inferred) {
            for (const d of deltas) {
              if (d > inferred * 1.5) gapsCount++;
            }
          }

          onStats({
            rowsParsed,
            rowsAccepted,
            nanPct: rowsParsed ? (nanCount / rowsParsed) * 100 : 0,
            dupsPct: rowsParsed ? (dupsCount / rowsParsed) * 100 : 0,
            gapsPct: deltas.length ? (gapsCount / deltas.length) * 100 : 0,
            inferredTimeframeMs: inferred,
            firstTs,
            lastTs,
          });

          resolve();
        } catch (e) {
          reject(e);
        }
      },
      error: (err) => reject(err),
    });
  });
}

/**
 * Infer timeframe string from milliseconds
 */
export function inferTimeframeString(ms: number | null): string {
  if (!ms) return "Unknown";
  
  const seconds = Math.round(ms / 1000);
  const minutes = Math.round(ms / 60000);
  const hours = Math.round(ms / 3600000);
  const days = Math.round(ms / 86400000);
  
  if (seconds <= 60) return `${seconds}s`;
  if (minutes <= 60) return `M${minutes}`;
  if (hours <= 24) return `H${hours}`;
  if (days <= 7) return `D${days}`;
  return `W${Math.round(days / 7)}`;
}

/**
 * File size guard
 */
export function validateFileSize(file: File, maxMB: number = 25): { valid: boolean; error?: string } {
  const sizeMB = file.size / (1024 * 1024);
  if (sizeMB > maxMB) {
    return { 
      valid: false, 
      error: `File too large (${sizeMB.toFixed(1)}MB). Maximum allowed: ${maxMB}MB.` 
    };
  }
  return { valid: true };
}
