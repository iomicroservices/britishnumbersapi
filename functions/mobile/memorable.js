async function handleRequest(request, env) {
  const url = new URL(request.url);
  const params = url.searchParams;

  // Base URL for database API
  const databaseUrl = `${env.MOBILE_DATABASE_BASE_URL}/rest/v1/mobile_numbers`;

  // Headers for authentication and preferences
  const headers = {
    'apikey': env.MOBILE_DATABASE_API_KEY,
    'Authorization': `Bearer ${env.MOBILE_DATABASE_API_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'count=exact'
  };

  // Dynamically add "Range" header if "range" query parameter is present and not null
  const rangeParam = params.get('range');
  if (rangeParam) {
    headers["Range"] = rangeParam;
  }

  // Constructing the query parameters, starting with always true condition for 'available'
  let queryParts = ['available=eq.true'];

  // Add search logic based on 'match' parameter
  const search = params.get('search');
  const match = params.get('match');
  if (search) {
    const searchCondition = match === 'exact' ? `eq.${search}` : `ilike.*${encodeURIComponent(search)}*`;
    queryParts.push(`number=${searchCondition}`);
  }

  // Add price filters if provided
  const priceLte = params.get('price_lte');
  const priceGte = params.get('price_gte');
  if (priceLte) {
    queryParts.push(`price=lte.${priceLte}`);
  }
  if (priceGte) {
    queryParts.push(`price=gte.${priceGte}`);
  }

  // Join all parts of the query with '&'
  const queryString = queryParts.join('&');

  // Making the request to the database
  try {
    const response = await fetch(`${databaseUrl}?${queryString}`, { method: 'GET', headers });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();

    return new Response(JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*' // Include this if your API is accessed from different origins
      },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: {
        'Content-Type': 'application/json',
      },
      status: 500,
    });
  }
}

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request, event.env));
});
