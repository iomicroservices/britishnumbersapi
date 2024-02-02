
export async function onRequestGet(context) {
    const baseURL = context.env.MOBILE_DATABASE_BASE_URL;
    const url = new URL(context.request.url);
    const searchParams = url.search;
    
    const headers = new Headers({
        'Prefer': 'count=exact',
        'apikey': context.env.MOBILE_DATABASE_API_KEY,
        'Authorization': `Bearer ${context.env.MOBILE_DATABASE_API_KEY}`,
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
    const price.gte = params.get('price_gte') || null;
    const price.lte = params.get('price_lte') || null;
    const range = params.get('range') || '0-99';
    
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


    // Construct the Supabase query URL
    const databaseURL = `${baseURL}?select=*`;

    const filters = [
        `available.eq.true`,
        `price.gte.${price_gte || '0'}`,
        `price.lte.${price_lte || '99'}`,
    ];

    if (match === 'exact') {
        filters.push(`${type}.eq.${search}`);
    } else {
        filters.push(`${type}.ilike.*${search}*`);
    }

    const query = `&and=(${filters.join(',')})`;

    const destinationURL = `${databaseURL}${query}`;

    try {
        const response = await fetch(destinationURL, {
            method: 'GET',
            headers: headers,
        });
        return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
        });
    } catch (error) {
        return new Response(`Error fetching memorable numbers: ${error.message}`, { status: 500 });
    }
}
