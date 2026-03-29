/**
 * Upload Market Data Edge Function
 * Handles chunked/resumable upload for large OHLCV files (50MB+)
 * Admin-only. CORS: Standard Supabase headers for web app access.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

// Standard CORS headers that work with all Lovable/localhost origins
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
};

interface UploadSession {
  sessionId: string;
  storagePath: string;
  totalParts: number;
  partSize: number;
  uploadedParts: number[];
  userId: string;
  createdAt: number;
  expiresAt: number;
}

const uploadSessions = new Map<string, UploadSession>();

// Cleanup expired sessions periodically
function cleanupExpiredSessions() {
  const now = Date.now();
  for (const [id, session] of uploadSessions) {
    if (now > session.expiresAt) {
      uploadSessions.delete(id);
    }
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    // Auth validation
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Authentication required", code: "AUTH_MISSING" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Validate user via getUser
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await userClient.auth.getUser(token);
    if (userError || !userData?.user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token", code: "AUTH_INVALID" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = userData.user.id;

    // Admin role check
    const { data: roleData } = await userClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: "Admin access required", code: "ADMIN_REQUIRED" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const url = new URL(req.url);
    const action = url.searchParams.get("action");
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Cleanup expired sessions on each request
    cleanupExpiredSessions();

    // === CREATE SESSION ===
    if (action === "create-session") {
      const body = await req.json();
      const { fileName, fileSize, symbol, timeframe } = body;

      if (!fileName || !fileSize || !symbol) {
        return new Response(
          JSON.stringify({ error: "fileName, fileSize, and symbol are required", code: "VALIDATION_ERROR" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const partSize = 8 * 1024 * 1024; // 8MB parts
      const totalParts = Math.ceil(fileSize / partSize);
      const sessionId = crypto.randomUUID();
      const storagePath = `${symbol.toUpperCase()}/${timeframe || "1m"}/${Date.now()}_${sessionId}.csv.gz`;

      const session: UploadSession = {
        sessionId,
        storagePath,
        totalParts,
        partSize,
        uploadedParts: [],
        userId,
        createdAt: Date.now(),
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
      };

      uploadSessions.set(sessionId, session);

      console.log(`[upload] Session created: ${sessionId}, parts: ${totalParts}, file: ${fileName}`);

      return new Response(
        JSON.stringify({
          sessionId,
          storagePath,
          totalParts,
          partSize,
          expiresAt: session.expiresAt,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // === UPLOAD PART ===
    if (action === "upload-part") {
      const sessionId = url.searchParams.get("sessionId");
      const partNumber = parseInt(url.searchParams.get("partNumber") || "0");

      if (!sessionId || isNaN(partNumber)) {
        return new Response(
          JSON.stringify({ error: "sessionId and partNumber required", code: "VALIDATION_ERROR" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const session = uploadSessions.get(sessionId);
      if (!session) {
        return new Response(
          JSON.stringify({ error: "Session not found or expired. Please restart the upload.", code: "SESSION_NOT_FOUND" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (Date.now() > session.expiresAt) {
        uploadSessions.delete(sessionId);
        return new Response(
          JSON.stringify({ error: "Session expired. Please restart the upload.", code: "SESSION_EXPIRED" }),
          { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const partData = await req.arrayBuffer();
      const partPath = `${session.storagePath}.part${partNumber}`;

      const { error: uploadError } = await adminClient.storage
        .from("market-data")
        .upload(partPath, partData, {
          contentType: "application/octet-stream",
          upsert: true,
        });

      if (uploadError) {
        console.error(`[upload] Part ${partNumber} failed for session ${sessionId}:`, uploadError);
        return new Response(
          JSON.stringify({ error: `Failed to upload part ${partNumber}`, code: "STORAGE_ERROR", details: uploadError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!session.uploadedParts.includes(partNumber)) {
        session.uploadedParts.push(partNumber);
        session.uploadedParts.sort((a, b) => a - b);
      }

      const isComplete = session.uploadedParts.length === session.totalParts;

      console.log(`[upload] Part ${partNumber + 1}/${session.totalParts} uploaded for session ${sessionId}`);

      return new Response(
        JSON.stringify({
          partNumber,
          uploadedParts: session.uploadedParts.length,
          totalParts: session.totalParts,
          isComplete,
          progress: Math.round((session.uploadedParts.length / session.totalParts) * 100),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // === COMPLETE ===
    if (action === "complete") {
      const body = await req.json();
      const { sessionId, metadata } = body;

      if (!sessionId) {
        return new Response(
          JSON.stringify({ error: "sessionId required", code: "VALIDATION_ERROR" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const session = uploadSessions.get(sessionId);
      if (!session) {
        return new Response(
          JSON.stringify({ error: "Session not found", code: "SESSION_NOT_FOUND" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (session.uploadedParts.length !== session.totalParts) {
        return new Response(
          JSON.stringify({
            error: `Upload incomplete: ${session.uploadedParts.length}/${session.totalParts} parts uploaded`,
            code: "UPLOAD_INCOMPLETE",
            uploaded: session.uploadedParts.length,
            required: session.totalParts,
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`[upload] Merging ${session.totalParts} parts for session ${sessionId}...`);

      // Download and merge all parts
      const chunks: Uint8Array[] = [];
      for (let i = 0; i < session.totalParts; i++) {
        const partPath = `${session.storagePath}.part${i}`;
        const { data: partData, error: downloadError } = await adminClient.storage
          .from("market-data")
          .download(partPath);

        if (downloadError || !partData) {
          console.error(`[upload] Failed to read part ${i}:`, downloadError);
          return new Response(
            JSON.stringify({ error: `Failed to read part ${i} during merge`, code: "MERGE_ERROR" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        chunks.push(new Uint8Array(await partData.arrayBuffer()));
      }

      // Combine chunks
      const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
      const combined = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        combined.set(chunk, offset);
        offset += chunk.length;
      }

      // Upload final combined file
      const { error: finalError } = await adminClient.storage
        .from("market-data")
        .upload(session.storagePath, combined, {
          contentType: "application/gzip",
          upsert: true,
        });

      if (finalError) {
        console.error(`[upload] Final file upload failed:`, finalError);
        return new Response(
          JSON.stringify({ error: "Failed to create final file", code: "STORAGE_ERROR" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Cleanup part files
      const partPaths = Array.from({ length: session.totalParts }, (_, i) => `${session.storagePath}.part${i}`);
      await adminClient.storage.from("market-data").remove(partPaths);

      // Insert metadata record
      if (metadata) {
        const { error: insertError } = await adminClient.from("shared_datasets").insert({
          name: metadata.name,
          symbol: metadata.symbol.toUpperCase(),
          timeframe: metadata.timeframe || "1m",
          row_count: metadata.rowCount || 0,
          file_size_bytes: combined.length,
          storage_path: session.storagePath,
          range_from_ts: metadata.rangeFromTs || 0,
          range_to_ts: metadata.rangeToTs || 0,
          columns_map: metadata.columnsMap || {},
          description: metadata.description || null,
          source_info: metadata.sourceInfo || null,
          uploaded_by: userId,
        });

        if (insertError) {
          console.error(`[upload] Metadata insert failed:`, insertError);
          // Cleanup the uploaded file
          await adminClient.storage.from("market-data").remove([session.storagePath]);
          return new Response(
            JSON.stringify({ error: "Failed to save dataset metadata", code: "DB_ERROR", details: insertError.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      uploadSessions.delete(sessionId);
      console.log(`[upload] Session ${sessionId} complete. File: ${session.storagePath}, Size: ${combined.length}`);

      return new Response(
        JSON.stringify({ success: true, storagePath: session.storagePath, fileSize: combined.length }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // === STATUS ===
    if (action === "status") {
      const sessionId = url.searchParams.get("sessionId");
      if (!sessionId) {
        return new Response(
          JSON.stringify({ error: "sessionId required", code: "VALIDATION_ERROR" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const session = uploadSessions.get(sessionId);
      if (!session) {
        return new Response(
          JSON.stringify({ error: "Session not found", code: "SESSION_NOT_FOUND" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          sessionId: session.sessionId,
          uploadedParts: session.uploadedParts,
          totalParts: session.totalParts,
          partSize: session.partSize,
          expiresAt: session.expiresAt,
          progress: Math.round((session.uploadedParts.length / session.totalParts) * 100),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action. Use: create-session, upload-part, complete, status", code: "INVALID_ACTION" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[upload] Unhandled error:", err);
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Internal server error",
        code: "INTERNAL_ERROR",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
