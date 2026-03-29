/**
 * Chunked Upload Service
 * Handles resumable multipart uploads for large files (50MB+)
 * Works with upload-market-data edge function
 */

import { supabase } from '@/integrations/supabase/client';

// Construct edge function URL using project ID (works across all environments)
const PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID;
const EDGE_FUNCTION_URL = PROJECT_ID
  ? `https://${PROJECT_ID}.supabase.co/functions/v1/upload-market-data`
  : `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-market-data`;

export interface UploadSession {
  sessionId: string;
  storagePath: string;
  totalParts: number;
  partSize: number;
  expiresAt: number;
}

export interface UploadProgress {
  phase: 'compressing' | 'uploading' | 'finalizing' | 'complete' | 'error';
  progress: number; // 0-100
  uploadedParts: number;
  totalParts: number;
  bytesUploaded: number;
  totalBytes: number;
  message: string;
  error?: string;
  errorCode?: string;
}

export interface UploadMetadata {
  name: string;
  symbol: string;
  timeframe: string;
  rowCount: number;
  rangeFromTs: number;
  rangeToTs: number;
  columnsMap: Record<string, string>;
  description?: string;
  sourceInfo?: string;
}

async function getAuthToken(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new UploadError('Authentication required. Please log in and try again.', 'AUTH_MISSING');
  }
  return session.access_token;
}

/** Structured upload error with error code for better UX */
class UploadError extends Error {
  code: string;
  constructor(message: string, code: string = 'UNKNOWN') {
    super(message);
    this.name = 'UploadError';
    this.code = code;
  }
}

/**
 * Parse edge function error response into UploadError
 */
async function parseErrorResponse(response: Response): Promise<UploadError> {
  try {
    const body = await response.json();
    return new UploadError(
      body.error || `Server error (${response.status})`,
      body.code || `HTTP_${response.status}`
    );
  } catch {
    return new UploadError(
      `Server error (${response.status}): ${response.statusText}`,
      `HTTP_${response.status}`
    );
  }
}

/**
 * Classify a fetch error into an actionable user message
 */
function classifyFetchError(err: unknown): UploadError {
  const msg = err instanceof Error ? err.message : String(err);

  if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('net::ERR_')) {
    return new UploadError(
      'Network error: Could not reach the server. Check your internet connection and try again.',
      'NETWORK_ERROR'
    );
  }
  if (msg.includes('CORS') || msg.includes('blocked by CORS')) {
    return new UploadError(
      'Request blocked by browser security (CORS). This is a server configuration issue.',
      'CORS_ERROR'
    );
  }
  if (msg.includes('AbortError') || msg.includes('aborted')) {
    return new UploadError('Upload was cancelled.', 'ABORTED');
  }
  if (msg.includes('timeout') || msg.includes('Timeout')) {
    return new UploadError('Upload timed out. Try again or check your connection speed.', 'TIMEOUT');
  }
  if (err instanceof UploadError) return err;

  return new UploadError(msg, 'UNKNOWN');
}

/**
 * Compress file using gzip
 */
async function compressFile(
  file: File, 
  onProgress?: (progress: number) => void
): Promise<Uint8Array> {
  onProgress?.(10);
  
  const buffer = await file.arrayBuffer();
  onProgress?.(30);
  
  const stream = new Blob([buffer]).stream().pipeThrough(
    new CompressionStream('gzip')
  );
  
  const compressedBlob = await new Response(stream).blob();
  onProgress?.(100);
  
  return new Uint8Array(await compressedBlob.arrayBuffer());
}

/**
 * Create upload session
 */
export async function createUploadSession(
  fileName: string,
  fileSize: number,
  symbol: string,
  timeframe: string
): Promise<UploadSession> {
  const token = await getAuthToken();
  
  let response: Response;
  try {
    response = await fetch(`${EDGE_FUNCTION_URL}?action=create-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ fileName, fileSize, symbol, timeframe }),
    });
  } catch (err) {
    throw classifyFetchError(err);
  }

  if (!response.ok) {
    throw await parseErrorResponse(response);
  }

  return response.json();
}

/**
 * Upload a single part
 */
async function uploadPart(
  sessionId: string,
  partNumber: number,
  partData: Uint8Array,
  retries = 3
): Promise<{ uploadedParts: number; totalParts: number; isComplete: boolean }> {
  const token = await getAuthToken();
  
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const arrayBuffer = new ArrayBuffer(partData.length);
      new Uint8Array(arrayBuffer).set(partData);
      const partBlob = new Blob([arrayBuffer], { type: 'application/octet-stream' });
      
      const response = await fetch(
        `${EDGE_FUNCTION_URL}?action=upload-part&sessionId=${sessionId}&partNumber=${partNumber}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/octet-stream',
            Authorization: `Bearer ${token}`,
          },
          body: partBlob,
        }
      );

      if (!response.ok) {
        throw await parseErrorResponse(response);
      }

      return response.json();
    } catch (err) {
      const classified = classifyFetchError(err);
      if (attempt === retries - 1) throw classified;
      
      // Exponential backoff for retryable errors
      if (classified.code === 'NETWORK_ERROR' || classified.code === 'TIMEOUT') {
        console.warn(`[chunkedUpload] Part ${partNumber} attempt ${attempt + 1} failed, retrying...`, classified.message);
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      } else {
        throw classified; // Non-retryable error
      }
    }
  }
  
  throw new UploadError('Part upload failed after all retries', 'RETRY_EXHAUSTED');
}

/**
 * Complete the upload and merge parts
 */
async function completeUpload(
  sessionId: string,
  metadata: UploadMetadata
): Promise<{ success: boolean; storagePath: string; fileSize: number }> {
  const token = await getAuthToken();
  
  let response: Response;
  try {
    response = await fetch(`${EDGE_FUNCTION_URL}?action=complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ sessionId, metadata }),
    });
  } catch (err) {
    throw classifyFetchError(err);
  }

  if (!response.ok) {
    throw await parseErrorResponse(response);
  }

  return response.json();
}

/**
 * Get session status for resuming
 */
export async function getSessionStatus(sessionId: string): Promise<{
  uploadedParts: number[];
  totalParts: number;
  progress: number;
} | null> {
  try {
    const token = await getAuthToken();
    
    const response = await fetch(
      `${EDGE_FUNCTION_URL}?action=status&sessionId=${sessionId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
}

/**
 * Main upload function with progress tracking
 */
export async function uploadLargeFile(
  file: File,
  metadata: UploadMetadata,
  onProgress?: (progress: UploadProgress) => void,
  existingSessionId?: string
): Promise<{ success: boolean; storagePath: string }> {
  
  try {
    // Phase 1: Compress
    onProgress?.({
      phase: 'compressing',
      progress: 0,
      uploadedParts: 0,
      totalParts: 0,
      bytesUploaded: 0,
      totalBytes: file.size,
      message: 'Compressing file...',
    });

    const compressedData = await compressFile(file, (p) => {
      onProgress?.({
        phase: 'compressing',
        progress: Math.round(p * 0.2), // 0-20%
        uploadedParts: 0,
        totalParts: 0,
        bytesUploaded: 0,
        totalBytes: file.size,
        message: `Compressing... ${Math.round(p)}%`,
      });
    });

    console.log(`[chunkedUpload] Compressed ${file.name}: ${file.size} → ${compressedData.length} bytes`);

    // Phase 2: Create session or resume
    let session: UploadSession;
    let uploadedParts: number[] = [];

    if (existingSessionId) {
      const status = await getSessionStatus(existingSessionId);
      if (status) {
        uploadedParts = status.uploadedParts;
        session = {
          sessionId: existingSessionId,
          storagePath: '',
          totalParts: status.totalParts,
          partSize: 8 * 1024 * 1024,
          expiresAt: Date.now() + 24 * 60 * 60 * 1000,
        };
        console.log(`[chunkedUpload] Resuming session ${existingSessionId}, ${uploadedParts.length}/${status.totalParts} parts done`);
      } else {
        session = await createUploadSession(
          file.name, compressedData.length, metadata.symbol, metadata.timeframe
        );
      }
    } else {
      session = await createUploadSession(
        file.name, compressedData.length, metadata.symbol, metadata.timeframe
      );
    }

    // Store session for potential resume
    localStorage.setItem(`upload_session_${file.name}`, session.sessionId);

    // Phase 3: Upload parts
    const { totalParts, partSize, sessionId } = session;
    
    for (let i = 0; i < totalParts; i++) {
      // Skip already uploaded parts (resume support)
      if (uploadedParts.includes(i)) continue;

      const start = i * partSize;
      const end = Math.min(start + partSize, compressedData.length);
      const partData = compressedData.slice(start, end);

      onProgress?.({
        phase: 'uploading',
        progress: 20 + Math.round((i / totalParts) * 60), // 20-80%
        uploadedParts: uploadedParts.length + 1,
        totalParts,
        bytesUploaded: end,
        totalBytes: compressedData.length,
        message: `Uploading part ${i + 1} of ${totalParts}...`,
      });

      await uploadPart(sessionId, i, partData);
      uploadedParts.push(i);
    }

    // Phase 4: Finalize
    onProgress?.({
      phase: 'finalizing',
      progress: 85,
      uploadedParts: totalParts,
      totalParts,
      bytesUploaded: compressedData.length,
      totalBytes: compressedData.length,
      message: 'Merging parts and saving...',
    });

    const result = await completeUpload(sessionId, metadata);

    // Cleanup session storage
    localStorage.removeItem(`upload_session_${file.name}`);

    onProgress?.({
      phase: 'complete',
      progress: 100,
      uploadedParts: totalParts,
      totalParts,
      bytesUploaded: compressedData.length,
      totalBytes: compressedData.length,
      message: 'Upload complete!',
    });

    return { success: true, storagePath: result.storagePath };

  } catch (err) {
    const classified = err instanceof UploadError ? err : classifyFetchError(err);
    
    console.error('[chunkedUpload] Upload failed:', classified.code, classified.message);

    onProgress?.({
      phase: 'error',
      progress: 0,
      uploadedParts: 0,
      totalParts: 0,
      bytesUploaded: 0,
      totalBytes: file.size,
      message: classified.message,
      error: classified.message,
      errorCode: classified.code,
    });

    throw classified;
  }
}

/**
 * Check for resumable session
 */
export function getResumableSession(fileName: string): string | null {
  return localStorage.getItem(`upload_session_${fileName}`);
}

/**
 * Clear resumable session
 */
export function clearResumableSession(fileName: string): void {
  localStorage.removeItem(`upload_session_${fileName}`);
}
