async function handleRequest(request, env) {
  const url = new URL(request.url);
  const params = url.searchParams;

  // Base URL for database API
  const databaseUrl = `${context.env.MOBILE_DATABASE_BASE_URL}/rest/v1/mobile_numbers`;

  // Headers for authentication and preferences
  const headers = {
    'apikey': ${context.env.MOBILE_DATABASE_API_KEY},
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

  // Making the request to database
  try {
    const response = await fetch(`${databaseUrl}?${query}`, { headers });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();

    // Optionally, handle the Range header if needed
    const range = params.get('range');
    const responseHeaders = new Headers({
      'Content-Type': 'application/json',
    });
    if (range) {
      responseHeaders.set('Range', range); // Note: Setting Range header like this may not have the intended effect on the response; adjust as needed.
    }

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
  event.respondWith(handleRequest(event.request, event.context.env));
});
