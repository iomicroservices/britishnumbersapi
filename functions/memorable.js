// /functions/memorable.js
export async function onRequestGet(context) {
    // Access environment variables using context.env
    const baseURL = context.env.MEMORABLE_WEBHOOK_BASE_URL; // Environment variable for the base URL
    
    // Extract the search parameters from the request URL
    const url = new URL(context.request.url);
    const searchParams = url.search; // This includes the '?' and the query string
    
    // Construct the destination URL using the base URL from environment variables and search parameters from the request
    const destinationURL = `${baseURL}${searchParams}`;
    
    try {
        const response = await fetch(destinationURL, {
            method: 'GET',
            headers: context.request.headers,
        });

        // Forward the response from the fetch call
        return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
        });
    } catch (error) {
        return new Response(`Error fetching memorable numbers: ${error.message}`, { status: 500 });
    }
}
