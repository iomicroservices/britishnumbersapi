// Use SHA-256 via WebCrypto (available in Workers)
async function sha256Hex(input) {
    const data = new TextEncoder().encode(input);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, '0')).join('');
}

const jsonHeaders = { 'Content-Type': 'application/json' };

// Authenticate partner using X-API-Key header
async function authenticatePartner(request, env) {
    const rawKey = request.headers.get('X-API-Key');
    if (!rawKey) {
        return {
            ok: false,
            response: new Response(JSON.stringify({
                status: 401,
                error: 'MISSING_API_KEY',
                message: 'Unauthorized: request was not successful because it lacks valid authentication credentials for the requested resource.',
            }), {
                status: 401,
                headers: jsonHeaders,
            }),
        };
    }

    const keyHash = await sha256Hex(rawKey);
    const baseURL = env.DATABASE_BASE_URL;
    const databaseApiKey = env.DATABASE_API_KEY;
    const rpcUrl = new URL(`${baseURL}/rest/v1/rpc/verify_partner_api_key`);

    const headers = new Headers();
    headers.set('apikey', databaseApiKey);
    headers.set('Authorization', `Bearer ${databaseApiKey}`);
    headers.set('Content-Type', 'application/json');
    headers.set('Accept', 'application/json');

    const r = await fetch(rpcUrl.toString(), {
        method: 'POST',
        headers,
        body: JSON.stringify({ p_key_hash: keyHash }),
    });

    if (!r.ok) {
        return {
            ok: false,
            response: new Response(JSON.stringify({
                status: 401,
                error: 'UNAUTHORIZED',
                message: 'The credentials provided are not valid for the specified partner. Please contact support.',
            }), {
                status: 401,
                headers: jsonHeaders,
            }),
        };
    }

    const rpcResult = await r.json();
    const row = Array.isArray(rpcResult) ? rpcResult[0] : rpcResult;
    const partnerId = typeof row === 'string' ? row : row?.partner_id ?? null;

    if (!partnerId) {
        return {
            ok: false,
            response: new Response(JSON.stringify({
                status: 401,
                error: 'INVALID_API_KEY',
                message: 'Unauthorized: The API key provided is invalid or inactive.',
            }), {
                status: 401,
                headers: jsonHeaders,
            }),
        };
    }

    return { ok: true, partnerId };
}

// Enforce body limit helper function
function enforceBodyLimit(request) {
    const len = Number(request.headers.get('Content-Length'));
    if (Number.isFinite(len) && len > 20_000) { // 20 KB hard-ish limit
        return new Response(
            JSON.stringify({ status: 413, error: 'PAYLOAD_TOO_LARGE' }),
            { status: 413, headers: jsonHeaders }
        );
    }
    return null;
}

// Parse application/x-www-form-urlencoded: items.number[0], items.provision[0], etc.
function parseFormItems(params) {
    const byIndex = new Map();
    const numberRe = /^items\.number\[(\d+)\]$/;
    const provisionRe = /^items\.provision\[(\d+)\]$/;
    for (const [key, value] of params.entries()) {
        const numberMatch = key.match(numberRe);
        if (numberMatch) {
            const i = parseInt(numberMatch[1], 10);
            if (!byIndex.has(i)) byIndex.set(i, { number: null, provision: null });
            byIndex.get(i).number = value;
            continue;
        }
        const provisionMatch = key.match(provisionRe);
        if (provisionMatch) {
            const i = parseInt(provisionMatch[1], 10);
            if (!byIndex.has(i)) byIndex.set(i, { number: null, provision: null });
            byIndex.get(i).provision = value;
        }
    }
    const indices = [...byIndex.keys()].sort((a, b) => a - b);
    return indices.map((i) => byIndex.get(i));
}

async function parsePostParams(request, url) {
    const contentType = (request.headers.get('Content-Type') || '').split(';')[0].trim().toLowerCase();
    if (contentType === 'application/json') {
        const body = await request.json();
        return {
            partnerId: body.partnerId ?? null,
            email: body.email ?? null,
            items: Array.isArray(body.items) ? body.items : [],
        };
    }
    if (contentType === 'application/x-www-form-urlencoded') {
        const bodyText = await request.text();
        const params = bodyText ? new URLSearchParams(bodyText) : url.searchParams; // ACTION: ThIS makes it possible to send POSTs with parameters in the query string if body is empty
        const items = parseFormItems(params);
        return {
            partnerId: params.get('partnerId') ?? null,
            email: params.get('email') ?? null,
            items,
        };
    }
    return null;
}

function setSupabaseHeaders(headers, databaseApiKey) {
    headers.set('apikey', databaseApiKey);
    headers.set('Authorization', `Bearer ${databaseApiKey}`);
    return headers;
}

// Validation rules: each returns an error message or null
const VALIDATIONS = {
    partnerId(params) {
        const v = params.partnerId;
        if (v == null || v === '') return 'partnerId: is required.';
        if (typeof v !== 'string') return 'partnerId: must be a string.';
        if (v.length > 50) return 'partnerId: must be at most 20 characters.';
        if (!/^[a-zA-Z0-9-]+$/.test(v)) return 'partnerId: only letters, numbers, and dashes allowed.';
        return null;
    },
    items(params) {
        const list = params.items;
        if (list == null || list.length === 0) return 'items: at least one item (with number) is required.';
        for (let i = 0; i < list.length; i++) {
            const n = list[i];
            if (!n || typeof n !== 'object') return `items[${i}]: must be an object with number and optional provision.`;
            const number = n.number;
            const provision = n.provision;
            if (number == null || number === '') return `items[${i}].number: is required.`;
            if (typeof number !== 'string') return `items[${i}].number: must be a string.`;
            if (number.length > 11) return `items[${i}].number: must be at most 11 characters.`;
            if (!/^\d+$/.test(number)) return `items[${i}].number: must contain only digits (0-9).`;
            if (provision == null || provision === '') continue;
            if (typeof provision !== 'string') return `items[${i}].provision: must be a string when provided.`;
            if (provision.length > 3) return `items[${i}].provision: must be at most 3 characters.`;
            if (provision !== 'PAC' && provision !== 'SIM') return `items[${i}].provision: must be PAC or SIM when provided.`;
        }
        return null;
    },
    email(params) {
        const v = params.email;
        if (v == null || v === '') return null;
        if (typeof v !== 'string') return 'email: must be a string.';
        if (v.length > 100) return 'email: maximum length is 100 characters.';
        if (!/^[a-zA-Z0-9._+-]+@[a-zA-Z0-9._+-]+\.[a-zA-Z]{2,}$/.test(v)) return 'email: must be a valid email; only letters, numbers, and ".", "_", "-", "+", "@" special characters allowed.';
        return null;
    },
};

function validatePurchaseParams(params) {
    const checks = [
        () => VALIDATIONS.partnerId(params),
        () => VALIDATIONS.items(params),
        () => VALIDATIONS.email(params),
    ];
    const errors = checks.flatMap((c) => {
        const r = c();
        return r ? [r] : [];
    });
    return errors;
}

// GET not supported; use POST with JSON body or application/x-www-form-urlencoded.
export async function onRequestGet() {
    return new Response(
        JSON.stringify({
            status: 405,
            error: 'Method not allowed',
            message: 'Use POST with Content-Type: application/json (body: partnerId, email?, items: [{ number, provision }]) or application/x-www-form-urlencoded (e.g. partnerId=…&items.number[0]=…&items.provision[0]=…).',
        }),
        { status: 405, headers: jsonHeaders }
    );
}

export async function onRequestPost(context) {
    const auth = await authenticatePartner(context.request, context.env);
    if (!auth.ok) return auth.response;

    // 🔒 Enforce body size limit early
    const bodyLimitResponse = enforceBodyLimit(context.request);
    if (bodyLimitResponse) return bodyLimitResponse;

    const url = new URL(context.request.url);
    const env = context.env;

    let params;
    try {
        params = await parsePostParams(context.request, url);
    } catch (e) {
        return new Response(JSON.stringify({ status: 400, error: 'INVALID_BODY', message: 'Invalid request body (expected JSON or form-urlencoded).' }), { status: 400, headers: jsonHeaders });
    }
    if (!params) {
        return new Response(JSON.stringify({ status: 415, error: 'UNSUPPORTED_MEDIA_TYPE', message: 'Content-Type must be application/json or application/x-www-form-urlencoded.' }), { status: 415, headers: jsonHeaders });
    }
    if (params.partnerId == null || params.partnerId === '') {
        return new Response(
            JSON.stringify({
                status: 403,
                error: 'FORBIDDEN',
                message: 'partnerId is required and must match the authenticated API key.',
            }),
            { status: 403, headers: jsonHeaders }
        );
    }
    if (params.partnerId !== auth.partnerId) {
        return new Response(
            JSON.stringify({
                status: 403,
                error: 'FORBIDDEN',
                message: 'The API key is not authorised for the specified partner.',
            }),
            { status: 403, headers: jsonHeaders }
        );
    }
    if (Array.isArray(params.items) && params.items.length > 100) {
        return new Response(
            JSON.stringify({
                status: 413,
                error: 'PAYLOAD_TOO_LARGE',
                message: 'Too many items: The maximum number of items allowed per request is 100.',
            }),
            { status: 413, headers: jsonHeaders }
        );
    }

    const errors = validatePurchaseParams(params);
    if (errors.length > 0) {
        return new Response(JSON.stringify({ status: 400, error: 'INVALID_PARAMS', message: errors }), { status: 400, headers: jsonHeaders });
    }

    const { partnerId, email, items: requestItems } = params;
    // Unique list of numbers for lookup; preserve order and provision per number (first occurrence).
    const numbersList = [];
    const numberToProvision = new Map();
    for (const { number, provision } of requestItems) {
        const normalizedProvision = provision == null || provision === '' ? 'PAC' : provision;
        if (!numberToProvision.has(number)) {
            numberToProvision.set(number, normalizedProvision);
            numbersList.push(number);
        }
    }

    const baseURL = env.DATABASE_BASE_URL;
    const databaseApiKey = env.DATABASE_API_KEY;
    const webhookBaseUrl = env.PURCHASE_WEBHOOK_BASE_URL;

    if (!baseURL || !databaseApiKey) {
        return new Response(JSON.stringify({ status: 500, error: 'INTERNAL_SERVER_ERROR', message: 'Service misconfigured' }), { status: 500, headers: jsonHeaders });
    }
    if (!webhookBaseUrl) {
        return new Response(JSON.stringify({ error: 'Purchase webhook not configured' }), { status: 503, headers: jsonHeaders });
    }

    const lookup = new URL(`${baseURL}/rest/v1/mobile_numbers`);
    lookup.searchParams.set('number', `in.(${numbersList.join(',')})`);
    lookup.searchParams.set('available', 'eq.true');
    lookup.searchParams.set('select', 'number,price,t1,t2,delivery');
    const lookupUrl = lookup.toString();

    const headers = setSupabaseHeaders(new Headers(), databaseApiKey);

    let lookupResponse;
    try {
        lookupResponse = await fetch(lookupUrl, { method: 'GET', headers });
    } catch (err) {
        console.error('Supabase lookup error:', err);
        return new Response(JSON.stringify({ status: 502, error: 'BAD_GATEWAY', message: 'Unable to verify numbers. Please try again.' }), { status: 502, headers: jsonHeaders });
    }

    if (!lookupResponse.ok) {
        console.error('Supabase lookup failed:', lookupResponse.status);
        return new Response(JSON.stringify({ status: 502, error: 'BAD_GATEWAY', message: 'Unable to verify numbers. Please try again.' }), { status: 502, headers: jsonHeaders });
    }

    const found = await lookupResponse.json();
    const foundByNumber = new Map((found || []).map((r) => [r.number, r]));
    const foundNumbers = new Set(foundByNumber.keys());

    const missing = numbersList.filter((n) => !foundNumbers.has(n));
    if (missing.length > 0) {
        const responseItems = numbersList.map((number) => {
            const row = foundByNumber.get(number);
            const provision = numberToProvision.get(number);
            if (row) {
                return { number, provision, delivery: row.delivery, type: "memorable", price: row.price, t1: row.t1, t2: row.t2, status: 'available' };
            }
            return { number, provision, delivery: null, type: "memorable", price: null, t1: null, t2: null, status: 'unavailable' };
        });
        const statusCode = missing.length === numbersList.length ? 404 : 409;
        const message = missing.length === numbersList.length
            ? 'All requested numbers are not available for purchase.'
            : 'One or more numbers are not available for purchase. Resubmit the request with the available numbers only.';
        return new Response(
            JSON.stringify({
                status: statusCode,
                message,
                available: [...foundNumbers],
                unavailable: missing,
                items: responseItems,
            }),
            { status: statusCode, headers: jsonHeaders }
        );
    }

    const pricedItems = numbersList.map((number) => {
        const row = foundByNumber.get(number);
        const provision = numberToProvision.get(number);
        return { number, provision, delivery: row?.delivery, type: "memorable", rrp: row?.price, t1: row?.t1, t2: row?.t2 };
    });
    const webhookPayload = {
        partnerId,
        email,
        numbers: pricedItems.map(({ number }) => number),
        items: pricedItems.map(({ number, provision, delivery, type, rrp, t1, t2 }) => ({ number, provision, delivery, type, rrp, t1, t2 })),
    };
    let webhookResponse;
    try {
        webhookResponse = await fetch(webhookBaseUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(webhookPayload),
        });
    } catch (err) {
        console.error('Webhook error:', err);
        return new Response(JSON.stringify({ status: 502, error: 'BAD_GATEWAY', message: 'Purchase request could not be completed. Please try again.' }), { status: 502, headers: jsonHeaders });
    }

    let message = null;

    try {
        const text = await webhookResponse.text();
        const ct = webhookResponse.headers.get('Content-Type') || '';

        if (ct.includes('application/json')) {
            // Prefer JSON if declared as JSON
            message = text ? JSON.parse(text) : null;
        } else {
            // If not declared JSON, try anyway (covers misconfigured webhooks)
            try {
                message = text ? JSON.parse(text) : '';
            } catch {
                message = text;
            }
        }
    } catch {
        message = null;
    }

    const responseItems = pricedItems.map(({ number, provision, delivery, rrp, t1, t2 }) => ({ number, provision, delivery, type: "memorable", price: rrp, t1, t2, status: 'processing' }));

    const body = {
        status: webhookResponse.status,
        message,
    };
    if (webhookResponse.ok) {
        body.available = [...foundNumbers];
        body.unavailable = [];
        body.items = responseItems;
    }

    return new Response(JSON.stringify(body), {
        status: webhookResponse.status,
        headers: jsonHeaders,
    });
}