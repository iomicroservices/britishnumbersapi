// Validation rules: each returns an error message or null (query params)
const VALIDATIONS = {
    partnerId(params) {
        const v = params.partnerId;
        if (v == null || v === '') return 'partnerId: is required.';
        if (typeof v !== 'string') return 'partnerId: must be a string.';
        if (v.length > 20) return 'partnerId: must be at most 20 characters.';
        if (!/^[a-zA-Z0-9]+$/.test(v)) return 'partnerId: only letters and numbers allowed.';
        return null;
    },
    numbers(params) {
        const list = params.numbers;
        if (list == null || list.length === 0) return 'number: at least one number query param is required.';
        for (let i = 0; i < list.length; i++) {
            const n = list[i];
            if (typeof n !== 'string') return `number: each value must be a string.`;
            if (n.length > 11) return `number: must be at most 11 characters.`;
            if (!/^\d+$/.test(n)) return `number: must contain only integers (0-9).`;
        }
        return null;
    },
    email(params) {
        const v = params.email;
        if (v == null || v === '') return null;
        if (typeof v !== 'string') return 'email: must be a string.';
        if (v.length > 100) return 'email: maximum length is 100 characters.';
        if (!/^[a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z]{2,}$/.test(v)) return 'email: must be a valid email; only letters, numbers, and ".", "_", "-", "@" special characters allowed.';
        return null;
    },
};

function validatePurchaseParams(params) {
    const checks = [
        () => VALIDATIONS.partnerId(params),
        () => VALIDATIONS.numbers(params),
        () => VALIDATIONS.email(params),
    ];
    const errors = checks.flatMap((c) => {
        const r = c();
        return r ? [r] : [];
    });
    return errors;
}

function setSupabaseHeaders(headers, apiKey) {
    headers.set('apikey', apiKey);
    headers.set('Authorization', `Bearer ${apiKey}`);
    headers.set('Content-Type', 'application/json');
    return headers;
}

const jsonHeaders = { 'Content-Type': 'application/json' };

// Repurpose GET requests to return purchase status and any additional information such as invoice using query params: partnerId and number.
export async function onRequestGet() {
    return new Response(
        JSON.stringify({
            status: 405,
            error: 'Method not allowed',
            message: 'Use POST with query params: partnerId (required) and number (repeat for multiple). Example: POST /rest/v2/mobile/memorable/purchase?partnerId=rec1234567890&number=07875604202',
        }),
        { status: 405, headers: jsonHeaders }
    );
}

export async function onRequestPost(context) {
    const url = new URL(context.request.url);
    const env = context.env;

    const partnerId = url.searchParams.get('partnerId') ?? null;
    const email = url.searchParams.get('email') ?? null;
    const numbers = url.searchParams.getAll('number');

    const params = { partnerId, email, numbers };

    const errors = validatePurchaseParams(params);
    if (errors.length > 0) {
        return new Response(JSON.stringify({ status: 400, error: 'INVALID_PARAMS', message: errors }), { status: 400, headers: jsonHeaders });
    }

    const baseURL = env.DATABASE_BASE_URL;
    const apiKey = env.DATABASE_API_KEY;
    const webhookBaseUrl = env.PURCHASE_WEBHOOK_BASE_URL;

    if (!baseURL || !apiKey) {
        return new Response(JSON.stringify({ status: 500, error: 'INTERNAL_SERVER_ERROR', message: 'Service misconfigured' }), { status: 500, headers: jsonHeaders });
    }
    if (!webhookBaseUrl) {
        return new Response(JSON.stringify({ error: 'Purchase webhook not configured' }), { status: 503, headers: jsonHeaders });
    }

    const numbersList = [...new Set(numbers)];

    const inFilter = numbersList.map((n) => encodeURIComponent(n)).join(',');
    const lookupUrl = `${baseURL}/rest/v1/mobile_numbers?number=in.(${inFilter})&available=eq.true&select=number,price,t1,t2`;
    const headers = setSupabaseHeaders(new Headers(), apiKey);

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
        const items = numbersList.map((number) => {
            const row = foundByNumber.get(number);
            if (row) {
                return { number, price: row.price, t1: row.t1, t2: row.t2, status: 'available' };
            }
            return { number, price: null, t1: null, t2: null, status: 'unavailable' };
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
                items,
            }),
            { status: statusCode, headers: jsonHeaders }
        );
    }

    const items = numbersList.map((number) => {
        const row = foundByNumber.get(number);
        return { number, rrp: row?.price, t1: row?.t1, t2: row?.t2 };
    });
    const webhookPayload = { partnerId, email, numbers: numbersList, items };
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

    let message;
    const contentType = webhookResponse.headers.get('Content-Type') || '';
    try {
        if (contentType.includes('application/json')) {
            message = await webhookResponse.json();
        } else {
            const text = await webhookResponse.text();
            try {
                const parsed = JSON.parse(text);
                message = typeof parsed === 'string' ? parsed : text;
            } catch {
                message = text;
            }
        }
    } catch {
        message = null;
    }

    const responseItems = items.map(({ number, rrp, t1, t2 }) => ({ number, price: rrp, t1, t2, status: 'processing' }));

    const body = {
        status: webhookResponse.status,
        message,
    };
    if (webhookResponse.status === 200) {
        body.available = [...foundNumbers];
        body.unavailable = [];
        body.items = responseItems;
    }

    return new Response(JSON.stringify(body), {
        status: webhookResponse.status,
        headers: jsonHeaders,
    });
}