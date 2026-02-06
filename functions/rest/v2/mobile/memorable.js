// Helper function to set headers
function setBaseHeaders(baseHeaders, range, apiKey) {
    baseHeaders.set('apikey', apiKey);
    baseHeaders.set('Authorization', `Bearer ${apiKey}`);
    if (range) {
        baseHeaders.set('Range', range);
    }
    baseHeaders.set('Prefer', 'count=exact');
    return baseHeaders;
}

// Helper function to validate price
function validatePrice(price) {
    return price && price.length <= 15 && /^\d+(\.\d+)?$/.test(price);
}

// Helper function to validate range
function validateRange(range) {
    if (!range) return null;

    const rangeParts = range.split('-');
    if (rangeParts.length !== 2 || !/^\d+$/.test(rangeParts[0]) || !/^\d+$/.test(rangeParts[1])) {
        return 'range parameter error: Range must be in the format "number-number", with both numbers being integers. Omitting this parameter will return the first 100 results. Maximum of 100 results can be returned at a time.';
    }
}

// Helper function to construct filters
function constructFilters({ type, search, price_gte, price_lte, match }) {
    // Default type to 'number' and search to ilike.** if search is null or empty
    type = type || 'number';  // Default type to 'number' if it's not provided
    search = search || '**';  // Default search to '**' if it's not provided

    const filters = ['available.eq.true'];

    if (price_gte && validatePrice(price_gte)) filters.push(`price.gte.${price_gte}`);
    if (price_lte && validatePrice(price_lte)) filters.push(`price.lte.${price_lte}`);

    // Construct the search filter
    if (match === 'exact') {
        filters.push(`${type}.eq.${search}`);
    } else {
        filters.push(`${type}.ilike.*${search}*`);  // Apply ilike for fuzzy search or if no match is provided
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
    };

    // Validate the URL parameters
    const errors = [];
    if (params.search !== null && (!/^\d+$/.test(params.search) || params.search.length > 11)) errors.push('search parameter error: search query must contain only numbers (0-9) of no more than 11 characters.');
    if (params.type !== 'number' && params.type !== 'prefix' && params.type !== 'last_six') errors.push('type parameter error: type query must be "number", "prefix", or "last_six". Omitting this parameter will default to "number".');
    if (params.match !== null && params.match !== '' && params.match !== 'exact' && params.match !== 'fuzzy') errors.push('match parameter error: match query must be "exact" or "fuzzy". Omitting this parameter will default to "fuzzy".');
    if (params.price_lte && !validatePrice(params.price_lte)) errors.push('price_lte parameter error: price_lte query must be a valid number or decimal of no more than 15 characters, or can be omitted.');
    if (params.price_gte && !validatePrice(params.price_gte)) errors.push('price_gte parameter error: price_gte parameter must be a valid number or decimal of no more than 15 characters, or can be omitted.');
    
    // Validate range
    const rangeError = validateRange(params.range);
    if (rangeError) errors.push(rangeError);

    if (errors.length > 0) {
        return new Response(errors.join('\n'), { status: 400 });
    }

    // Construct filters for the API call
    const filters = constructFilters(params);

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
            // Parse the JSON response to get the details
            const errorData = await firstResponse.json();

            // Construct the error message with the status and details
            const errorMessage = `${firstResponse.status} database request failed with the following details: ${errorData.details || 'No details available.'}`;

            // Throw the error with the detailed message
            throw new Error(errorMessage);
        }

        const json = await firstResponse.json();
        const contentRange = firstResponse.headers.get('Content-Range');
        let totalCount = 0;

        if (contentRange) {
            const parts = contentRange.split('/');
            if (parts.length > 1) totalCount = parts[1]; // The part after '/' is the total count
        }

        // Second API call to log/create a new search record
        const newSearchURL = `${baseURL}/rest/v1/search_queries`;
        const matchValue = (params.match === 'exact') ? 'exact' : 'fuzzy'; // Determine if match should be 'exact' or 'fuzzy'
        baseHeaders.set('Content-Type', 'application/json');
        baseHeaders.set('Prefer', 'return=minimal');
        await fetch(newSearchURL, {
            method: 'POST',
            headers: baseHeaders,
            body: JSON.stringify({
                search: params.search,
                type: params.type,
                count: totalCount,
                source: sourceUrl,
                mobile: 1,
                landline: 0,
                // result: JSON.stringify(json),
                match: matchValue,
            }),
        });

        // Return the response from the first API call
        return new Response(JSON.stringify(json), {
            status: firstResponse.status,  // Use the status of the first API response
            headers: {
                'Content-Type': 'application/json',
                'Content-Range': contentRange || '',  // Include Content-Range if available, otherwise an empty string
            },
        });
    } catch (error) {
        // Error handling for both API calls
        return new Response(`Error: ${error.message}`, { status: 500 });
    }
}