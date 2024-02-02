async function handleRequest(request, env) {
  const url = new URL(request.url);
  const params = url.searchParams;

  // Base URL for database API - Use `env` directly as function parameter
  const databaseUrl = `${env.MOBILE_DATABASE_BASE_URL}/rest/v1/mobile_numbers`;

  // Headers for authentication and preferences - Correctly interpolate the environment variable
  const headers = {
    'apikey': env.MOBILE_DATABASE_API_KEY, // Corrected: Removed ${} since it's already JavaScript context
    'Content-Type': 'application/json',
    'Prefer': 'count=exact'
  };

  // Add "Range" header if "range" query parameter is present and not null
  const range = params.get('range');
  if (range) {
    headers["Range"] = range;
  }
    
  // Constructing the query parameters
  let query = `available=eq.true`;

  // Add search logic based on 'match' parameter
  const search = params.get('search');
  const match = params.get('match');
  if (search) {
    if (match === 'exact') {
      query += `&number=eq.${search}`;
    } else {
      // Use asterisks for wildcard in ilike search
      query += `&number=ilike.*${encodeURIComponent(search)}*`;
    }
  }

  // Add price filters if provided
  const price_lte = params.get('price_lte');
  const price_gte = params.get('price_gte');
  if (price_lte) {
    query += `&price=lte.${price_lte}`;
  }
  if (price_gte) {
    query += `&price=gte.${price_gte}`;
  }

  // Making the request to the database
  try {
    const response = await fetch(`${databaseUrl}?${query}`, { method: 'GET', headers: headers });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();

    // Construct response headers object
    const responseHeaders = new Headers({
      'Content-Type': 'application/json',
      // Include CORS headers if this API is meant to be accessed from web browsers on different origins
      'Access-Control-Allow-Origin': '*'
    });

    return new Response(JSON.stringify(data), {
      headers: responseHeaders,
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    });
  }
}

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request, event.env)); // Updated to pass `event.env` correctly
});
