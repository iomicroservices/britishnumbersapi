export async function onRequestGet(context) {
    const baseURL = context.env.DATABASE_BASE_URL;
    const url = new URL(context.request.url);
    const searchParams = url.search;

    const headers = new Headers({
        'Prefer': 'count=exact',
        'apikey': context.env.DATABASE_API_KEY,
        'Authorization': `Bearer ${context.env.DATABASE_API_KEY}`,
    });

    // Check if the "range" parameter exists and is not null in the URL
    if (url.searchParams.has('range') && url.searchParams.get('range') !== null) {
        headers.set('Range', url.searchParams.get('range'));
    }

    // Extract query parameters from the request
    const params = url.searchParams;
    const type = params.get('type') || 'number';
    const search = params.get('search') || '247365';
    const match = params.get('match') || null;
    const price_gte = params.get('price_gte') || null;
    const price_lte = params.get('price_lte') || null;

    // Validate the URL parameters
    const errors = [];

    if (!/^\d+$/.test(search)) {
        errors.push('Search query must contain only numbers.');
    }
    if (type !== 'number' && type !== 'prefix' && type !== 'last_six') {
        errors.push('Invalid type parameter. Use "number", "prefix", or "last_six".');
    }
    if (price_lte && !/^\d+(\.\d+)?$/.test(price_lte)) {
        errors.push('Invalid price_lte parameter. Use a valid number or decimal.');
    }
    if (price_gte && !/^\d+(\.\d+)?$/.test(price_gte)) {
        errors.push('Invalid price_gte parameter. Use a valid number or decimal.');
    }
    if (match && match !== 'exact') {
        errors.push('Invalid match parameter. Use "exact" or leave it blank.');
    }
    // Check if there are any validation errors
    if (errors.length > 0) {
        return new Response(errors.join('\n'), { status: 400 });
    }

    // Construct the database query URL
    const searchMobileURL = `${baseURL}/rest/v1/mobile_numbers?select=*`;
    const filters = [
        `available.eq.true`,
    ];
    
    if (price_lte && /^\d+(\.\d+)?$/.test(price_lte)) {
        filters.push(`price.lte.${price_lte}`);
    }
    
    if (price_gte && /^\d+(\.\d+)?$/.test(price_gte)) {
        filters.push(`price.gte.${price_gte}`);
    }
    
    if (match === 'exact') {
        filters.push(`${type}.eq.${search}`);
    } else {
        filters.push(`${type}.ilike.*${search}*`);
    }
    
    const query = `&and=(${filters.join(',')})`;
    
    const destinationURL = `${searchMobileURL}${query}`;

    try {
        const response = await fetch(destinationURL, {
            method: 'GET',
            headers: headers,
        });

        if (!response.ok) {
            throw new Error(`Database request failed with status: ${response.status}`);
        }

        const json = await response.json();

        return new Response(JSON.stringify(json), {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
            body: response.data,
        });
    } catch (error) {
        return new Response(`Error fetching memorable numbers: ${error.message}`, { status: 500 });
    }
}
