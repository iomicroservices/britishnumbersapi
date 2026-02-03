// Simple handler that instructs callers to select a resource.
// Returns a clear, structured JSON payload. Uses Cloudflare Pages Function format.
export async function onRequest(context) {
    const url = new URL(context.request.url);
    const basePath = url.pathname.replace(/\/$/, "") || "/rest/v2/telephone";

    const payload = {
        status: "info",
        message: "Please select a resource in telephone.",
        help: {
            availableResources: ["numbers", "blacklist", "callwhisper", "switchboard", "prices", "purchase", "cdrs", "greetingss", "search", "voicemail", "holiday", "ntshunt"],
            example: `${basePath}/search`,
            docs: "https://api.britishnumbers.com",
        },
    };

    return new Response(JSON.stringify(payload), {
        status: 200,
        headers: { "Content-Type": "application/json" },
    });
}