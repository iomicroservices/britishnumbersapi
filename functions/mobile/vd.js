export async function onRequestGet(context) {
    const baseURL = context.env.DATABASE_BASE_URL;
    const url = new URL(context.request.url);
    const apiKey = context.env.DATABASE_API_KEY;
    const searchParams = url.search;
    const sourceUrl = context.request.headers.get('Referer') || 'unknown';
    

    // Common headers pre-configured
    const baseHeaders = new Headers({
        'apikey': apiKey,
        'Authorization': `Bearer ${apiKey}`,
    });

    // Extract query parameters
    const params = url.searchParams;
    const type = params.get('type') || 'number';
    const search = params.get('search') || '247365';
    const network = params.get('network') || null;
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

    if (errors.length > 0) {
        return new Response(errors.join('\n'), { status: 400 });
    }

    // Construct the first API call URL
    const searchMobileURL = `${baseURL}/rest/v1/mobile_numbers?select=number,price`;
    const filters = [`available.eq.true`];

    if (price_gte && /^\d+(\.\d+)?$/.test(price_gte)) {
        filters.push(`price.gte.${price_gte}`);
    }
    if (price_lte && /^\d+(\.\d+)?$/.test(price_lte)) {
        filters.push(`price.lte.${price_lte}`);
    }
    if (match === 'exact') {
        filters.push(`${type}.eq.${search}`);
    } else {
        filters.push(`${type}.ilike.*${search}*`);
    }
    if (network) {
    filters.push(`network.eq.${network}`;
    }


    const query = `&and=(${filters.join(',')})`;
    const destinationURL = `${searchMobileURL}${query}`;

    try {
        // First API call to fetch data
        baseHeaders.set('Prefer', 'count=exact');
        const firstResponse = await fetch(destinationURL, {
            method: 'GET',
            headers: baseHeaders,
        });

        if (!firstResponse.ok) {
            throw new Error(`Database request failed with status: ${firstResponse.status}`);
        }

        const json = await firstResponse.json();
      

        // Return the response from the first API call
        return new Response(JSON.stringify(json), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        // Error handling for both API calls
        return new Response(`Error: ${error.message}`, { status: 500 });
    }
}
