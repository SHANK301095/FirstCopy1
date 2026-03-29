/**
 * Health Check Endpoint
 * Returns app and database connectivity status
 * 
 * GET /health - Returns health status
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  version: string;
  checks: {
    app: "ok" | "error";
    database: "ok" | "error" | "unknown";
    latency_ms: number;
  };
  environment: "production" | "staging" | "development";
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const startTime = Date.now();

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY");
    
    let dbStatus: "ok" | "error" | "unknown" = "unknown";
    
    if (supabaseUrl && supabaseKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        // Simple query to check database connectivity
        const { error } = await supabase
          .from("profiles")
          .select("id")
          .limit(1);
        
        dbStatus = error ? "error" : "ok";
      } catch {
        dbStatus = "error";
      }
    }

    const latency = Date.now() - startTime;
    
    // Determine environment
    const env = Deno.env.get("ENVIRONMENT") || 
                (supabaseUrl?.includes("localhost") ? "development" : "production");

    // Build health response
    const health: HealthStatus = {
      status: dbStatus === "ok" ? "healthy" : dbStatus === "error" ? "degraded" : "healthy",
      timestamp: new Date().toISOString(),
      version: Deno.env.get("APP_VERSION") || "1.0.0",
      checks: {
        app: "ok",
        database: dbStatus,
        latency_ms: latency,
      },
      environment: env as HealthStatus["environment"],
    };

    return new Response(JSON.stringify(health), {
      status: health.status === "healthy" ? 200 : 503,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Health check failed:", error);
    
    const health: HealthStatus = {
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      version: "unknown",
      checks: {
        app: "error",
        database: "unknown",
        latency_ms: Date.now() - startTime,
      },
      environment: "production",
    };

    return new Response(JSON.stringify(health), {
      status: 503,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
