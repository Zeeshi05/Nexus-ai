import { NextRequest } from "next/server";
import { createSupabaseAdmin } from "@/lib/db/supabase-server";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;

  // Set headers for Server-Sent Events (SSE)
  const headers = new Headers({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
  });

  const supabaseAdmin = await createSupabaseAdmin();
  let lastSeenLogId = "";

  const encoder = new TextEncoder();

  // Create stream
  const stream = new ReadableStream({
    async start(controller) {
      // Send initial heartbeat
      controller.enqueue(encoder.encode(":\n\n"));

      const interval = setInterval(async () => {
        try {
          // Fetch any new logs for this project
          let query = supabaseAdmin
            .from("build_logs")
            .select("id, event_type, file_path, content, payload, created_at")
            .eq("project_id", projectId)
            .order("created_at", { ascending: true });

          const { data: logs, error } = await query;

          if (error) {
            console.error("SSE database fetch error:", error);
            return;
          }

          if (logs && logs.length > 0) {
            // Find index of last seen log
            let startIndex = 0;
            if (lastSeenLogId) {
              const lastIdx = logs.findIndex((l: any) => l.id === lastSeenLogId);
              if (lastIdx !== -1) {
                startIndex = lastIdx + 1;
              }
            }

            // Stream new logs
            for (let i = startIndex; i < logs.length; i++) {
              const log = logs[i];
              const eventData = {
                type: log.event_type,
                filePath: log.file_path,
                content: log.content,
                assignedTo: log.payload?.assignedTo,
                order: log.payload?.order,
                total: log.payload?.total,
                totalFiles: log.payload?.totalFiles,
                totalTokens: log.payload?.totalTokens,
                totalCost: log.payload?.totalCost,
                tokenBreakdown: log.payload?.tokenBreakdown,
                error: log.payload?.error,
                timestamp: log.created_at,
              };

              controller.enqueue(encoder.encode(`data: ${JSON.stringify(eventData)}\n\n`));
              lastSeenLogId = log.id;

              // If build is complete or errored, close connection
              if (log.event_type === "build_complete" || log.event_type === "build_error") {
                clearInterval(interval);
                controller.close();
                return;
              }
            }
          }
        } catch (err) {
          console.error("SSE stream loop error:", err);
          clearInterval(interval);
          controller.close();
        }
      }, 1500); // Poll every 1.5 seconds

      // Handle client disconnect
      request.signal.addEventListener("abort", () => {
        clearInterval(interval);
      });
    },
  });

  return new Response(stream, { headers });
}
// End of route handler
