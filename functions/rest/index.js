// Simple handler that instructs callers to select an API version and resource.
// Returns a clear, structured JSON payload. Uses Cloudflare Pages Function format.
export async function onRequest(context) {
  const url = new URL(context.request.url);
  const basePath = url.pathname.replace(/\/$/, "") || "/rest";

  const payload = {
    status: "info",
    message: "Please select an API version and resource.",
    help: {
      availableVersions: ["v1", "v2"],
      availableResources: ["mobile", "telephone"],
      example: `${basePath}/v2/mobile/memorable`,
      docs: "https://api.britishnumbers.com",
    },
  };

  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}