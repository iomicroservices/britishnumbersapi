export async function onRequestGet(context) {
    const baseURL = context.env.TELEPHONE_BASE_URL;
    const url = new URL(context.request.url);
    const telephoneApiKey = context.env.TELEPHONE_API_KEY;
    const searchParams = url.search;
    const sourceUrl = context.request.headers.get('Referer') || 'unknown';
    

    // Common headers pre-configured
    const baseHeaders = new Headers({
        'Authorization': `${telephoneApiKey}`,
    });


    // Extract query parameters
    const params = url.searchParams;
    const areaCode = params.get('areaCode') || '0333';
    const grade = params.get('grade') || 'All';

    // Validate the URL parameters
    const errors = [];

    if (!/^\d+$/.test(areaCode)) {
        errors.push('areaCode must contain only numbers.');
    }
    if (grade !== 'All' && grade !== 'Bronze' && grade !== 'Silver' && grade !== 'Gold' && grade !== 'Platinum') {
        errors.push('Invalid grade parameter. Use "All", "Bronze", "Silver", "Gold" or "Platinum".');
    }

    if (errors.length > 0) {
        return new Response(errors.join('\n'), { status: 400 });
    }

    // Construct the API call
    const searchTelephoneURL = `${baseURL}/list/available/`;
    const destinationURL = `${searchTelephoneURL}${areaCode}`;

    try {
        // First API call to fetch data
        baseHeaders.set('Content-Type', 'application/json');
        const response = await fetch(destinationURL, {
            method: 'GET',
            headers: baseHeaders,
        });

        if (!response.ok) {
            throw new Error(`Database request failed with status: ${response.status}`);
        }

        const json = await response.json();

        // Return the response from the first API call
        return new Response(JSON.stringify(json), {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
            body: response.data,
        });
    } catch (error) {
        // Error handling for both API calls
        return new Response(`Error fetching telephone numbers: ${error.message}`, { status: 500 });
    }
}
