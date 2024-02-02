
export async function onRequestGet(context) {
    const baseURL = context.env.MOBILE_DATABASE_BASE_URL;
    const url = new URL(context.request.url);
    const searchParams = url.search;
    const destinationURL = `${baseURL}${searchParams}`;
    
    const headers = new Headers({
        'Prefer': 'count=exact',
        'apikey': context.env.MOBILE_DATABASE_API_KEY,
        'Authorization': `Bearer ${context.env.MOBILE_DATABASE_API_KEY}`,
    });
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
