export async function onRequestGet(context) {
    const baseURL = context.env.MEMORABLE_WEBHOOK_BASE_URL;
    const url = new URL(context.request.url);
    const searchParams = url.search;
    const destinationURL = `${baseURL}${searchParams}`;
    try {
        const response = await fetch(destinationURL, {
            method: 'GET',
            headers: context.request.headers,
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
