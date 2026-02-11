// Helper function to set headers
function setBaseHeaders(baseHeaders, range, apiKey) {
    baseHeaders.set('apikey', apiKey);
    baseHeaders.set('Authorization', `Bearer ${apiKey}`);
    if (range) baseHeaders.set('Range', range);
    baseHeaders.set('Prefer', 'count=exact');
    return baseHeaders;
}

// Validation rules: each returns an error message or null
const VALIDATIONS = {
    searchDigits: (params) =>
        params.search !== null && !/^\d+$/.test(params.search)
            ? 'search: must contain only digits (0-9).'
            : null,
    searchLength: (params) => {
        if (params.search === null) return null;
        // Global max 11 chars; stricter (6) for prefix/last_six
        const maxLen = (params.type === 'prefix' || params.type === 'last_six') ? 6 : 11;
        return params.search.length > maxLen ? `search: must be at most ${maxLen} characters for type "${params.type}".` : null;
    },
    type: (params) =>
        params.type !== 'number' && params.type !== 'prefix' && params.type !== 'last_six'
            ? 'type: must be "number", "prefix", or "last_six". Omit to default to "number".'
            : null,
    match: (params) =>
        params.match !== null && params.match !== '' && params.match !== 'exact' && params.match !== 'fuzzy'
            ? 'match: must be "exact" or "fuzzy". Omit to default to "fuzzy".'
            : null,
    isValidPrice: (price) => {
        return price && price.length <= 15 && /^\d+(\.\d+)?$/.test(price);
    },
    price: (value, paramName) => {
        if (!value) return null;
        return VALIDATIONS.isValidPrice(value) ? null : `${paramName}: must be a valid number or decimal, max 15 characters, or omitted.`;
    },
    priceLte: (params) => VALIDATIONS.price(params.price_lte, 'price_lte'),
    priceGte: (params) => VALIDATIONS.price(params.price_gte, 'price_gte'),
    range: (params) => {
        const range = params.range;
        if (!range) return null;
        const parts = range.split('-');
        if (parts.length !== 2 || !/^\d+$/.test(parts[0]) || !/^\d+$/.test(parts[1])) {
            return 'range: must be "start-end" (two integers). Omit for first 100 results. Max 100 results per request.';
        }
        return null;
    },
    delivery: (params) => {
        const v = params.delivery;
        if (v == null || v === '') return null;
        if (typeof v !== 'string') return 'delivery: must be a string.';
        if (v.length > 2) return 'delivery: must be at most 2 characters.';
        if (!/^\d+$/.test(v)) return 'delivery: must contain only digits (0-9).';
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
    // Default type to 'number' and search to ilike.** if search is null or empty
    type = type || 'number';  // Default type to 'number' if it's not provided
    search = search || '**';  // Default search to '**' if it's not provided

    const filters = ['available.eq.true'];

    // Construct the price filter
    if (price_gte && VALIDATIONS.isValidPrice(price_gte)) filters.push(`price.gte.${price_gte}`);
    if (price_lte && VALIDATIONS.isValidPrice(price_lte)) filters.push(`price.lte.${price_lte}`);

    // Construct the search filter
    if (match === 'exact') {
        filters.push(`${type}.eq.${search}`);
    } else {
        filters.push(`${type}.ilike.*${search}*`);  // Apply ilike for fuzzy search or if no match is provided
    }

    // Add delivery filter if provided
    if (delivery) {
        filters.push(`delivery.eq.${delivery}`);
    }

    return filters;
}

// Main function
export async function onRequestGet(context) {
    const baseURL = context.env.DATABASE_BASE_URL;
    const url = new URL(context.request.url);
    const apiKey = context.env.DATABASE_API_KEY;
    const sourceUrl = context.request.headers.get('Referer') || 'unknown';

    // Extract query parameters
    const params = {
        type: url.searchParams.get('type') || 'number',
        search: url.searchParams.get('search') || null,
        match: url.searchParams.get('match') || null,
        price_gte: url.searchParams.get('price_gte') || null,
        price_lte: url.searchParams.get('price_lte') || null,
        range: url.searchParams.get('range') || null,
        delivery: url.searchParams.get('delivery') || null,
    };

    const errors = validateParams(params);
    if (errors.length > 0) {
        return new Response(errors.join('\n'), { status: 400 });
    }

    // Construct filters for the API call
    const filters = constructFilters(params);

    // Check if the base URL or API key is not set
    if (!baseURL || !apiKey) {
        return new Response(JSON.stringify({ error: 'Service misconfigured' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
    // Construct the API URL
    const query = `&and=(${filters.join(',')})`;
    const destinationURL = `${baseURL}/rest/v1/mobile_numbers?select=*${query}`;

    const baseHeaders = new Headers();
    setBaseHeaders(baseHeaders, params.range, apiKey); // Set headers with the range if exists

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
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const json = await firstResponse.json();
        const contentRange = firstResponse.headers.get('Content-Range') || '';
        const totalCount = contentRange.includes('/') ? contentRange.split('/')[1] : 0;

        // Log search in background so response returns immediately (no await)
        const matchValue = params.match === 'exact' ? 'exact' : 'fuzzy';
        const logHeaders = new Headers(baseHeaders);
        logHeaders.set('Content-Type', 'application/json');
        logHeaders.set('Prefer', 'return=minimal');
        const logBody = JSON.stringify({
            search: params.search,
            type: params.type,
            count: totalCount,
            source: sourceUrl,
            mobile: 1,
            landline: 0,
            match: matchValue,
        });
        if (context.waitUntil) {
            context.waitUntil(fetch(`${baseURL}/rest/v1/search_queries`, { method: 'POST', headers: logHeaders, body: logBody }));
        } else {
            fetch(`${baseURL}/rest/v1/search_queries`, { method: 'POST', headers: logHeaders, body: logBody });
        }

        // Return the response from the first API call
        return new Response(JSON.stringify(json), {
            status: firstResponse.status,  // Use the status of the first API response
            headers: {
                'Content-Type': 'application/json',
                'Content-Range': contentRange || '',  // Include Content-Range if available, otherwise an empty string
            },
        });
    } catch (error) {
        console.error('Memorable search error:', error);
        return new Response(JSON.stringify({ error: 'An unexpected error occurred. Please try again.' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}