// /functions/admin.js  (Cloudflare Pages Functions)
//
// PURPOSE
// -------
// This file exposes *internal admin-only endpoints* used to:
// 1) Hash partner API keys using SHA-256
// 2) (Optionally) generate new API keys
//
// IMPORTANT
// ---------
// - These endpoints are NOT for partners.
// - They are protected by an ADMIN_SECRET.
// - They do NOT write anything to Supabase.
// - They are a provisioning / bootstrap tool.
//
// Once you’ve created your partner keys, you can remove or lock this down further.

// ----------------------------------------------------
// Constants and helpers
// ----------------------------------------------------

// Standard JSON response header
const JSON_HEADERS = { 'Content-Type': 'application/json' };

// UUID v4 validator (for partner_id)
const PARTNER_ID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Small helper to return JSON responses consistently
function json(status, body, extraHeaders = {}) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { ...JSON_HEADERS, ...extraHeaders },
    });
}

// ----------------------------------------------------
// Crypto: SHA-256 hashing using Web Crypto (built-in)
// ----------------------------------------------------
//
// Cloudflare Workers provide `crypto.subtle` out of the box.
// No Node.js, no packages, no installs.

async function sha256Hex(input) {
    const data = new TextEncoder().encode(input);
    const hash = await crypto.subtle.digest('SHA-256', data);

    // Convert ArrayBuffer -> hex string
    return [...new Uint8Array(hash)]
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
}

// ----------------------------------------------------
// Request helpers
// ----------------------------------------------------

// Extract the request path (eg /admin/hash)
function getPath(request) {
    const url = new URL(request.url);
    return url.pathname;
}

// Enforce admin authentication
//
// The caller must provide:
//   Header: X-Admin-Secret: <ADMIN_SECRET>
//
// This is checked against an env var stored only in Cloudflare.
function requireAdmin(request, env) {
    const expected = env.ADMIN_SECRET;

    // Fail closed if misconfigured
    if (!expected || typeof expected !== 'string' || expected.length < 16) {
        return { ok: false, response: json(500, { error: 'ADMIN_NOT_CONFIGURED' }) };
    }

    const provided = request.headers.get('X-Admin-Secret') || '';
    if (provided !== expected) {
        // Do not leak details
        return { ok: false, response: json(403, { error: 'FORBIDDEN' }) };
    }

    return { ok: true };
}

// Safely read and validate a JSON request body
async function readJsonBody(request) {
    try {
        const ct = (request.headers.get('Content-Type') || '')
            .split(';')[0]
            .trim()
            .toLowerCase();

        if (ct !== 'application/json') {
            return { ok: false, error: 'Content-Type must be application/json' };
        }

        const body = await request.json();
        return { ok: true, body };
    } catch {
        return { ok: false, error: 'Invalid JSON body' };
    }
}

// Validate and extract partner_id from the request body
//
// We REQUIRE partner_id so:
// - every generated / hashed key is explicitly tied to a partner
// - no ambiguity when storing in Supabase later
function requirePartnerId(body) {
    const partner_id = body?.partner_id;

    if (!partner_id || typeof partner_id !== 'string') {
        return { ok: false, message: 'partner_id (string UUID) is required.' };
    }

    if (!PARTNER_ID_RE.test(partner_id)) {
        return { ok: false, message: 'partner_id must be a valid UUID.' };
    }

    return { ok: true, partner_id };
}

// ----------------------------------------------------
// Optional utility: generate a random API key
// ----------------------------------------------------
//
// This is purely for convenience.
// You still only store the HASH in Supabase.

function generateApiKey(prefix = 'sk_live_') {
    const bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);

    const token = [...bytes]
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

    return `${prefix}${token}`;
}

// ----------------------------------------------------
// Main request handler
// ----------------------------------------------------

export async function onRequest(context) {
    const { request, env } = context;
    const path = getPath(request);
    const method = request.method.toUpperCase();

    // 1) Require admin authentication for ALL /admin routes
    const auth = requireAdmin(request, env);
    if (!auth.ok) return auth.response;

    // --------------------------------------------------
    // GET /admin
    // --------------------------------------------------
    // Simple index / self-documentation for convenience.
    // You can remove this if you want zero surface area.

    if ((path === '/admin' || path === '/admin/') && method === 'GET') {
        return json(200, {
            ok: true,
            endpoints: {
                hash: {
                    method: 'POST',
                    path: '/admin/hash',
                    body: {
                        partner_id: '00000000-0000-0000-0000-000000000000',
                        partner_api_key: 'sk_live_...',
                    },
                },
                generate: {
                    method: 'POST',
                    path: '/admin/generate-key',
                    body: {
                        partner_id: '00000000-0000-0000-0000-000000000000',
                        prefix: 'sk_live_',
                    },
                },
            },
        });
    }

    // --------------------------------------------------
    // POST /admin/hash
    // --------------------------------------------------
    // Takes:
    //   { partner_id, partner_api_key }
    //
    // Returns:
    //   { partner_id, key_hash }
    //
    // This does NOT write to Supabase.

    if ((path === '/admin/hash' || path === '/admin/hash/') && method === 'POST') {
        const parsed = await readJsonBody(request);
        if (!parsed.ok) {
            return json(400, { error: 'INVALID_BODY', message: parsed.error });
        }

        const pid = requirePartnerId(parsed.body);
        if (!pid.ok) {
            return json(400, { error: 'INVALID_PARAMS', message: pid.message });
        }

        const partner_api_key = parsed.body?.partner_api_key;
        if (!partner_api_key || typeof partner_api_key !== 'string') {
            return json(400, {
                error: 'INVALID_PARAMS',
                message: 'partner_api_key (string) is required.',
            });
        }

        if (partner_api_key.length < 16 || appartner_api_keyiKey.length > 200) {
            return json(400, {
                error: 'INVALID_PARAMS',
                message: 'partner_api_key length looks invalid.',
            });
        }

        const key_hash = await sha256Hex(partner_api_key);

        return json(200, {
            partner_id: pid.partner_id,
            partner_api_key,
            key_hash,
        });
    }

    // --------------------------------------------------
    // POST /admin/generate-key
    // --------------------------------------------------
    // Generates a new API key AND hashes it.
    //
    // Returns:
    //   { partner_id, partner_api_key, key_hash }
    //
    // You:
    // - give partner_api_key to the partner (ONCE)
    // - store key_hash in Supabase

    if (
        (path === '/admin/generate-key' || path === '/admin/generate-key/') &&
        method === 'POST'
    ) {
        const parsed = await readJsonBody(request);
        if (!parsed.ok) {
            return json(400, { error: 'INVALID_BODY', message: parsed.error });
        }

        const pid = requirePartnerId(parsed.body);
        if (!pid.ok) {
            return json(400, { error: 'INVALID_PARAMS', message: pid.message });
        }

        const prefix =
            parsed.body?.prefix && typeof parsed.body.prefix === 'string'
                ? parsed.body.prefix
                : 'sk_live_';

        const partner_api_key = generateApiKey(prefix);
        const key_hash = await sha256Hex(partner_api_key);

        return json(200, {
            partner_id: pid.partner_id,
            partner_api_key: pid.partner_api_key,
            key_hash,
        });
    }

    // --------------------------------------------------
    // Fallback
    // --------------------------------------------------

    return json(404, { error: 'NOT_FOUND' });
}