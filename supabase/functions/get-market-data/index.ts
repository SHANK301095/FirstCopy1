/**
 * Get Market Data Edge Function
 * Serves shared OHLCV data for backtesting
 * CORS: Restricted origins only
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const ALLOWED_ORIGINS = [
  Deno.env.get("SUPABASE_URL") || '',
  'https://mmc3010.lovable.app',
  'https://id-preview--9585abe7-4b28-4e9d-87d4-d095da7c3d10.lovable.app',
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') || '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[1];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
}

// Aggregation timeframe in milliseconds
const TIMEFRAME_MS: Record<string, number> = {
  '1m': 60 * 1000,
  '5m': 5 * 60 * 1000,
  '15m': 15 * 60 * 1000,
  '30m': 30 * 60 * 1000,
  '1H': 60 * 60 * 1000,
  '4H': 4 * 60 * 60 * 1000,
  '1D': 24 * 60 * 60 * 1000,
};

// Aggregate OHLCV bars to higher timeframe
function aggregateBars(bars: number[][], targetTfMs: number): number[][] {
  if (bars.length === 0) return [];
  
  const aggregated: number[][] = [];
  let currentBucket: number[][] = [];
  let bucketStart = Math.floor(bars[0][0] / targetTfMs) * targetTfMs;
  
  for (const bar of bars) {
    const barBucket = Math.floor(bar[0] / targetTfMs) * targetTfMs;
    
    if (barBucket > bucketStart && currentBucket.length > 0) {
      // Finalize previous bucket
      aggregated.push(mergeBucket(currentBucket, bucketStart));
      currentBucket = [];
      bucketStart = barBucket;
    }
    
    currentBucket.push(bar);
  }
  
  // Finalize last bucket
  if (currentBucket.length > 0) {
    aggregated.push(mergeBucket(currentBucket, bucketStart));
  }
  
  return aggregated;
}

// Merge multiple bars into single OHLCV candle
function mergeBucket(bars: number[][], bucketTs: number): number[] {
  const open = bars[0][1];
  const close = bars[bars.length - 1][4];
  let high = -Infinity;
  let low = Infinity;
  let volume = 0;
  
  for (const bar of bars) {
    if (bar[2] > high) high = bar[2];
    if (bar[3] < low) low = bar[3];
    volume += bar[5] || 0;
  }
  
  return [bucketTs, open, high, low, close, volume];
}

// Streaming line parser for memory efficiency
class LineParser {
  private buffer = '';
  private lines: string[] = [];

  push(chunk: string): void {
    this.buffer += chunk;
    const parts = this.buffer.split('\n');
    this.buffer = parts.pop() || '';
    this.lines.push(...parts);
  }

  flush(): void {
    if (this.buffer) {
      this.lines.push(this.buffer);
      this.buffer = '';
    }
  }

  getLines(): string[] {
    return this.lines;
  }
}

// Parse a CSV line handling quoted values
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

// Gzip decompression - download full file then decompress
async function decompressGzipFromStream(stream: ReadableStream<Uint8Array>): Promise<string> {
  // Collect all chunks from stream
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }
  reader.releaseLock();
  
  // Combine into single buffer
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const combined = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.length;
  }
  
  // Decompress using DecompressionStream
  try {
    const decompressionStream = new DecompressionStream('gzip');
    const writer = decompressionStream.writable.getWriter();
    const decompReader = decompressionStream.readable.getReader();
    
    const decompressedChunks: Uint8Array[] = [];
    
    // Write compressed data
    await writer.write(combined);
    await writer.close();
    
    // Read decompressed data
    while (true) {
      const { done, value } = await decompReader.read();
      if (done) break;
      if (value) decompressedChunks.push(value);
    }
    
    // Combine and decode
    const decompressedLength = decompressedChunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const decompressed = new Uint8Array(decompressedLength);
    let decompOffset = 0;
    for (const chunk of decompressedChunks) {
      decompressed.set(chunk, decompOffset);
      decompOffset += chunk.length;
    }
    
    return new TextDecoder().decode(decompressed);
  } catch (err) {
    console.error('Gzip decompression failed:', err);
    throw new Error('Failed to decompress data');
  }
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // User client for auth verification
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify user is authenticated
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getUser(token);
    if (claimsError || !claimsData?.user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request
    const body = await req.json();
    const { 
      datasetId, 
      chunkIndex = 0, 
      chunkSize = 50000,
      startTs,  // Optional: filter by start timestamp
      endTs,    // Optional: filter by end timestamp
      aggregateTo, // Optional: target timeframe for aggregation (5m, 15m, 1H, 4H, 1D)
    } = body;
    
    // Validate aggregation timeframe if provided
    const targetTfMs = aggregateTo ? TIMEFRAME_MS[aggregateTo] : null;
    if (aggregateTo && !targetTfMs) {
      return new Response(
        JSON.stringify({ 
          error: "Invalid aggregateTo timeframe", 
          valid: Object.keys(TIMEFRAME_MS)
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!datasetId) {
      return new Response(
        JSON.stringify({ error: "datasetId required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get dataset metadata (user can see this via RLS)
    const { data: dataset, error: datasetError } = await userClient
      .from("shared_datasets")
      .select("*")
      .eq("id", datasetId)
      .maybeSingle();

    if (datasetError || !dataset) {
      return new Response(
        JSON.stringify({ error: "Dataset not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role to access storage (users can't access directly)
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Get signed URL for streaming download
    const { data: signedUrlData, error: signedUrlError } = await adminClient.storage
      .from("market-data")
      .createSignedUrl(dataset.storage_path, 300); // 5 min expiry

    if (signedUrlError || !signedUrlData?.signedUrl) {
      console.error("Signed URL error:", signedUrlError);
      return new Response(
        JSON.stringify({ error: "Failed to access data file" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Stream the file
    const fileResponse = await fetch(signedUrlData.signedUrl);
    if (!fileResponse.ok || !fileResponse.body) {
      return new Response(
        JSON.stringify({ error: "Failed to fetch data file" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if gzipped (by extension or magic bytes)
    const isGzipped = dataset.storage_path.endsWith('.gz') || 
                      dataset.storage_path.endsWith('.gzip');

    // Stream and parse CSV
    const lineParser = new LineParser();
    const decoder = new TextDecoder();
    const allRows: number[][] = [];
    let headers: string[] = [];
    let headersParsed = false;

    // Get column mapping from dataset
    const colMap = (dataset.columns_map as Record<string, string>) || {};

    // Process stream
    const processStream = async (stream: ReadableStream<Uint8Array>) => {
      const reader = stream.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          lineParser.push(decoder.decode(value, { stream: true }));
        }
        lineParser.push(decoder.decode()); // Flush decoder
        lineParser.flush();
      } finally {
        reader.releaseLock();
      }
    };

    // Handle gzip decompression or plain text
    let csvText: string;
    if (isGzipped) {
      csvText = await decompressGzipFromStream(fileResponse.body);
      lineParser.push(csvText);
      lineParser.flush();
    } else {
      await processStream(fileResponse.body);
    }

    // Parse all lines
    const lines = lineParser.getLines();
    
    if (lines.length === 0) {
      return new Response(
        JSON.stringify({ rows: [], meta: { totalRows: 0, hasMore: false } }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse headers
    headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().replace(/"/g, ''));
    
    // Find column indices
    const findColIdx = (mapping: string): number => {
      // First try mapped column
      const mappedCol = Object.entries(colMap).find(([_, v]) => v === mapping)?.[0];
      if (mappedCol) {
        const idx = headers.indexOf(mappedCol.toLowerCase());
        if (idx >= 0) return idx;
      }
      // Fallback to common names
      const commonNames = {
        timestamp: ['timestamp', 'time', 'date', 'datetime', 'ts'],
        open: ['open', 'o'],
        high: ['high', 'h'],
        low: ['low', 'l'],
        close: ['close', 'c'],
        volume: ['volume', 'vol', 'v'],
      };
      const names = commonNames[mapping as keyof typeof commonNames] || [mapping];
      for (const name of names) {
        const idx = headers.indexOf(name);
        if (idx >= 0) return idx;
      }
      return -1;
    };

    const tsIdx = findColIdx('timestamp');
    const oIdx = findColIdx('open');
    const hIdx = findColIdx('high');
    const lIdx = findColIdx('low');
    const cIdx = findColIdx('close');
    const vIdx = findColIdx('volume');

    if (tsIdx < 0 || oIdx < 0 || hIdx < 0 || lIdx < 0 || cIdx < 0) {
      return new Response(
        JSON.stringify({ 
          error: "Missing required columns", 
          headers,
          required: ['timestamp', 'open', 'high', 'low', 'close']
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse data rows (skip header)
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const cols = parseCSVLine(line);
      if (cols.length < 5) continue;

      // Parse timestamp
      let ts = parseFloat(cols[tsIdx]);
      if (isNaN(ts)) {
        const parsed = Date.parse(cols[tsIdx]);
        if (!isNaN(parsed)) ts = parsed;
        else continue;
      }
      // Convert seconds to ms if needed
      if (ts < 1e12) ts *= 1000;

      // Apply date range filter if specified
      if (startTs && ts < startTs) continue;
      if (endTs && ts > endTs) continue;

      allRows.push([
        ts,
        parseFloat(cols[oIdx]) || 0,
        parseFloat(cols[hIdx]) || 0,
        parseFloat(cols[lIdx]) || 0,
        parseFloat(cols[cIdx]) || 0,
        vIdx >= 0 ? parseFloat(cols[vIdx]) || 0 : 0,
      ]);
    }

    // Sort by timestamp
    allRows.sort((a, b) => a[0] - b[0]);
    
    // Apply server-side aggregation if requested
    let finalRows = allRows;
    let effectiveTimeframe = dataset.timeframe;
    
    if (targetTfMs) {
      // Only aggregate if target is larger than source
      const sourceTfMs = TIMEFRAME_MS[dataset.timeframe] || 60000; // Default 1m
      if (targetTfMs > sourceTfMs) {
        console.log(`Aggregating ${allRows.length} rows from ${dataset.timeframe} to ${aggregateTo}`);
        finalRows = aggregateBars(allRows, targetTfMs);
        effectiveTimeframe = aggregateTo;
        console.log(`Aggregated to ${finalRows.length} rows`);
      }
    }

    // Calculate pagination
    const totalRows = finalRows.length;
    const totalChunks = Math.ceil(totalRows / chunkSize);
    const requestedChunk = chunkIndex ?? 0;

    if (requestedChunk >= totalChunks || totalRows === 0) {
      return new Response(
        JSON.stringify({ 
          rows: [], 
          meta: { 
            symbol: dataset.symbol,
            timeframe: effectiveTimeframe,
            sourceTimeframe: dataset.timeframe,
            totalRows, 
            totalChunks, 
            currentChunk: requestedChunk,
            hasMore: false,
            rangeFrom: dataset.range_from_ts,
            rangeTo: dataset.range_to_ts,
            aggregatedFrom: aggregateTo ? dataset.timeframe : undefined,
          } 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Return requested chunk
    const startIdx = requestedChunk * chunkSize;
    const endIdx = Math.min(startIdx + chunkSize, totalRows);
    const chunk = finalRows.slice(startIdx, endIdx);

    return new Response(
      JSON.stringify({
        rows: chunk,
        meta: {
          symbol: dataset.symbol,
          timeframe: effectiveTimeframe,
          sourceTimeframe: dataset.timeframe,
          totalRows,
          totalChunks,
          currentChunk: requestedChunk,
          hasMore: requestedChunk < totalChunks - 1,
          rangeFrom: finalRows[0]?.[0],
          rangeTo: finalRows[finalRows.length - 1]?.[0],
          aggregatedFrom: aggregateTo ? dataset.timeframe : undefined,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
