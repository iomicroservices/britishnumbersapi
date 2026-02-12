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
                message: "Unauthorized: request was not successful because it lacks valid authentication credentials for the requested resource.",
            }), {
                status: 401,
                headers: jsonHeaders,
            }),
        };
    }

    const keyHash = await sha256Hex(rawKey);

    const baseURL = env.DATABASE_BASE_URL;

    // ✅ IMPORTANT: this must be your Supabase Service Role key (server-only)
    const databaseApiKey = env.DATABASE_API_KEY;

    const u = new URL(`${baseURL}/rest/v1/rpc/verify_partner_api_key`);

    const headers = new Headers();
    headers.set('apikey', databaseApiKey);
    headers.set('Authorization', `Bearer ${databaseApiKey}`);
    headers.set('Content-Type', 'application/json');
    headers.set('Accept', 'application/json');

    const r = await fetch(u.toString(), {
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
                message: "Authentication failed. Please try again.",
            }), {
                status: 401,
                headers: jsonHeaders,
            }),
        };
    }
    const rpcResult = await r.json();
    // Accept common PostgREST RPC return shapes:
    // 1) [{ partner_id: "..." }]
    // 2) { partner_id: "..." }
    // 3) "..." (partner_id as text)
    const row = Array.isArray(rpcResult) ? rpcResult[0] : rpcResult;
    const partnerId =
        typeof row === 'string'
            ? row
            : row?.partner_id ?? null;

    if (!partnerId) {
        return {
            ok: false,
            response: new Response(JSON.stringify({
                status: 401,
                error: 'UNAUTHORIZED',
                message: "The credentials provided are not valid for the specified partner. Please contact support.",
            }), {
                status: 401,
                headers: jsonHeaders,
            }),
        };
    }

    return { ok: true, partnerId };
}

// Helper function to set headers
function setBaseHeaders(baseHeaders, range, databaseApiKey) {
    baseHeaders.set('apikey', databaseApiKey);
    baseHeaders.set('Authorization', `Bearer ${databaseApiKey}`);
    if (range) baseHeaders.set('Range', range);
    baseHeaders.set('Prefer', 'count=exact');
    return baseHeaders;
}

function stripSpaces(value) {
    if (value == null) return null;
    const normalized = String(value).replace(/\s+/g, '');
    return normalized === '' ? null : normalized;
}

// Validation rules: each returns an error message or null
const VALIDATIONS = {
    type: (params) =>
        params.type !== 'number' && params.type !== 'prefix' && params.type !== 'last_six'
            ? 'type: must be number, prefix, or last_six. Omit to default to number.'
            : null,
    searchDigits: (params) =>
        params.search !== null && !/^\d+$/.test(params.search)
            ? 'search: must contain only digits (0-9).'
            : null,
    searchLength: (params) => {
        if (params.search === null) return null;
        if (params.type !== 'number' && params.type !== 'prefix' && params.type !== 'last_six') return null;
        // Global max 11 chars; stricter (6) for prefix/last_six
        const maxLen = (params.type === 'prefix' || params.type === 'last_six') ? 6 : 11;
        return params.search.length > maxLen ? `search: must be at most ${maxLen} characters for type ${params.type}.` : null;
    },
    match: (params) =>
        params.match !== null && params.match !== '' && params.match !== 'exact' && params.match !== 'fuzzy'
            ? 'match: must be exact or fuzzy. Omit to default to fuzzy.'
            : null,
    isValidPrice: (price) => {
        return price && price.length <= 15 && /^\d+(\.\d{1,2})?$/.test(price);
    },
    price: (value, paramName) => {
        if (!value) return null;
        return VALIDATIONS.isValidPrice(value) ? null : `${paramName}: must be a valid number or decimal (max 2 decimal places), max 15 characters, or omitted.`;
    },
    priceLte: (params) => VALIDATIONS.price(params.price_lte, 'price_lte'),
    priceGte: (params) => VALIDATIONS.price(params.price_gte, 'price_gte'),
    range: (params) => {
        const range = params.range;
        if (!range) return null;
        const parts = range.split('-');
        if (parts.length !== 2 || !/^\d+$/.test(parts[0]) || !/^\d+$/.test(parts[1])) {
            return 'range: must be start-end (two integers). Omit for first 100 results. Max 100 results per request.';
        }
        const start = parseInt(parts[0], 10);
        const end = parseInt(parts[1], 10);
        if (start > end) {
            return 'range: start must be less than or equal to end.';
        }
        return null;
    },
    delivery: (params) => {
        const v = params.delivery;
        if (v == null || v === '') return null;
        if (typeof v !== 'string') return 'delivery: must be a string.';
        if (v.length > 2) return 'delivery: must be at most 2 characters.';
        if (!/^\d{1,2}$/.test(v)) return 'delivery: must be an integer with up to 2 digits (no decimals).';
        const validValues = ['1', '7'];
        if (!validValues.includes(v)) return 'delivery: must be 1 or 7';
        return null;
    },
};

function validateParams(params) {
    const errors = [];
    const checks = [
        () => VALIDATIONS.searchDigits(params),
        () => VALIDATIONS.type(params),
        () => VALIDATIONS.searchLength(params),
        () => VALIDATIONS.match(params),
        () => VALIDATIONS.priceLte(params),
        () => VALIDATIONS.priceGte(params),
        () => VALIDATIONS.range(params),
        () => VALIDATIONS.delivery(params),
    ];
    for (const check of checks) {
        const msg = check();
        if (msg) errors.push(msg);
    }
    return errors;
}

// Helper function to construct filters
function constructFilters({ type, search, price_gte, price_lte, match, delivery }) {
    const filters = ['available.eq.true'];

    // Construct the search filter
    if (!search) {
        // Browse mode: return catalogue regardless of match
        filters.push(`${type}.ilike.*`); // equivalent to match-all
    } else if (match === 'exact') {
        filters.push(`${type}.eq.${search}`);
    } else {
        filters.push(`${type}.ilike.*${search}*`);
    }

    // Construct the price filter
    if (price_gte && VALIDATIONS.isValidPrice(price_gte)) filters.push(`price.gte.${price_gte}`);
    if (price_lte && VALIDATIONS.isValidPrice(price_lte)) filters.push(`price.lte.${price_lte}`);

    // Add delivery filter if provided
    if (delivery) filters.push(`delivery.eq.${delivery}`);

    return filters;
}

// Main function
export async function onRequestGet(context) {

    // ✅ NEW: authenticate partner at the very start
    const auth = await authenticatePartner(context.request, context.env);
    if (!auth.ok) return auth.response;

    // Create request context object with reusable variables
    const reqCtx = {
        partnerId: auth.partnerId,
        sourceUrl: context.request.headers.get('Referer') || 'unknown',
        baseURL: context.env.DATABASE_BASE_URL,
        databaseApiKey: context.env.DATABASE_API_KEY,
        url: new URL(context.request.url),
    };

    // Extract query parameters
    const params = {
        type: stripSpaces(reqCtx.url.searchParams.get('type')) || 'number',
        search: stripSpaces(reqCtx.url.searchParams.get('search')),
        match: stripSpaces(reqCtx.url.searchParams.get('match')),
        price_gte: stripSpaces(reqCtx.url.searchParams.get('price_gte')),
        price_lte: stripSpaces(reqCtx.url.searchParams.get('price_lte')),
        range: stripSpaces(reqCtx.url.searchParams.get('range')),
        delivery: stripSpaces(reqCtx.url.searchParams.get('delivery')),
    };

    const errors = validateParams(params);
    if (errors.length > 0) {
        return new Response(
            JSON.stringify({
                status: 400,
                error: 'INVALID_PARAMS',
                messages: errors,
            }),
            { status: 400, headers: jsonHeaders }
        );
    }

    // Check if the base URL or API key is not set
    if (!reqCtx.baseURL || !reqCtx.databaseApiKey) {
        return new Response(JSON.stringify({ error: 'Service misconfigured' }), { status: 500, headers: jsonHeaders });
    }

    // Construct filters for the API call
    const filters = constructFilters(params);

    // Construct the API URL safely (handles URL encoding)
    const supabaseUrl = new URL(`${reqCtx.baseURL}/rest/v1/mobile_numbers`);
    supabaseUrl.searchParams.set('select', '*');
    supabaseUrl.searchParams.set('and', `(${filters.join(',')})`);
    const destinationURL = supabaseUrl.toString();

    // Construct the API headers
    const baseHeaders = new Headers();
    setBaseHeaders(baseHeaders, params.range, reqCtx.databaseApiKey); // Set headers with the range if exists

    try {
        const firstResponse = await fetch(destinationURL, {
            method: 'GET',
            headers: baseHeaders,
        });

        // Check if the first response is not OK
        if (!firstResponse.ok) {
            const errorData = await firstResponse.json().catch(() => ({}));
            console.error('Supabase request failed:', firstResponse.status, errorData);
            return new Response(JSON.stringify({ error: 'Search request failed. Please try again.' }), {
                status: 502,
                headers: jsonHeaders,
            });
        }

        const json = await firstResponse.json();
        
        const contentRange = firstResponse.headers.get('Content-Range') || '';
        let rangeEffective = null;
        let totalCount = 0;
        if (contentRange.includes('/')) {
            const [re, tc] = contentRange.split('/');
            rangeEffective = re || null;
            totalCount = tc ? parseInt(tc, 10) || 0 : 0;
        }

        // Log search in background so response returns immediately (no await)
        const matchValue = params.match === 'exact' ? 'exact' : 'fuzzy';
        const logHeaders = new Headers(baseHeaders);
        logHeaders.set('Content-Type', 'application/json');
        logHeaders.set('Prefer', 'return=minimal');
        const logBody = JSON.stringify({
            search: params.search,
            type: params.type,
            count: totalCount,
            range_submitted: params.range,
            range_effective: rangeEffective,
            source: reqCtx.sourceUrl,
            mobile: 1,
            landline: 0,
            match: matchValue,
            partner_id: reqCtx.partnerId,
        });

        // LEGACY DEPRECATED: Log the search query to the search_queries table
        // if (context.waitUntil) {
        //     context.waitUntil(fetch(`${reqCtx.baseURL}/rest/v1/search_queries`, { method: 'POST', headers: logHeaders, body: logBody }));
        // } else {
        //     fetch(`${reqCtx.baseURL}/rest/v1/search_queries`, { method: 'POST', headers: logHeaders, body: logBody });
        // }

        // ✅ OPTIONAL: increment daily usage (RPC) in the same waitUntil
        const today = new Date().toISOString().slice(0, 10);
        const incUrl = new URL(`${reqCtx.baseURL}/rest/v1/rpc/increment_api_usage`);
        const incBody = JSON.stringify({ p_partner: reqCtx.partnerId, p_day: today });

        const bgTasks = Promise.all([
            fetch(`${reqCtx.baseURL}/rest/v1/search_queries`, {
                method: 'POST',
                headers: logHeaders,
                body: logBody,
            }),
            fetch(incUrl.toString(), {
                method: 'POST',
                headers: logHeaders,
                body: incBody,
            }),
        ]).catch((e) => console.error('Background logging failed:', e));

        if (context.waitUntil) {
            context.waitUntil(bgTasks);
        } else {
            // fallback (still fire-and-forget)
            bgTasks;
        }

        // Return the response from the first API call
        return new Response(JSON.stringify(json), {
            status: firstResponse.status,  // Use the status of the first API response
            headers: {
                'Content-Type': 'application/json',
                'Content-Range': contentRange || '',
            },
        });
    } catch (error) {
        console.error('Memorable search error:', error);
        return new Response(JSON.stringify({ error: 'An unexpected error occurred. Please try again.' }), {
            status: 500,
            headers: jsonHeaders,
        });
    }
}