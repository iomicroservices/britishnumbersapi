export async function onRequestGet(context) {
    const baseURL = context.env.MOBILE_DATABASE_BASE_URL;
    const url = new URL(context.request.url);
    const searchParams = url.search;

    const headers = new Headers({
        'Prefer': 'count=exact',
        'apikey': context.env.MOBILE_DATABASE_API_KEY,
        'Authorization': `Bearer ${context.env.MOBILE_DATABASE_API_KEY}`,
    });

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

        if (!response.ok) {
            throw new Error(`Supabase request failed with status: ${response.status}`);
        }

        const databaseResponse = await response.json();
        const responseData = databaseResponse.data; // Extract the "Data" field

        // Return the extracted data as the response
        return new Response(JSON.stringify(responseData), {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
            body: JSON.stringify(responseData),
        });
    } catch (error) {
        return new Response(`Error fetching memorable numbers: ${error.message}`, { status: 500 });
    }
}
