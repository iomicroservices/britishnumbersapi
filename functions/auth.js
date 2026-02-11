// DEPRECATED: This file is no longer used.

export function extractAuthHeader(request) {
    const authHeader = request.headers.get('Authorization') || '';
    return authHeader;
}

export async function verifyApiKey(authHeader) {
    const url = `${context.env.DATABASE_BASE_URL}/rest/v1/resellerKeys?select=*&apiKey=eq.${encodeURIComponent(authHeader)}`;

    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'apikey': context.env.DATABASE_API_KEY,
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        console.error('Failed to verify API key with database:', response.statusText);
        return false;
    }

    const data = await response.json();
    return data.length > 0;
}
