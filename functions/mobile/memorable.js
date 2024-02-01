export async function onRequestGet(request) {
  const baseURL = context.env.MOBILE_DATABASE_BASE_URL;
  const url = new URL(request.url);

  // Extract query parameters from the request
  const params = url.searchParams;
  const type = params.get('type') || 'number';
  const search = params.get('search') || null;
  const match = params.get('match') || null;
  const priceGte = params.get('price_gte') || null;
  const priceLte = params.get('price_lte') || null;

  // Construct the database API query string
  let filter = match === 'exact' ? `eq.${search}` : `ilike.%${search}%`;
  let queryString = `?${type}=${filter}&available=eq.true`;
  
  if (priceGte !== null) {
      queryString += `&price=gte.${priceGte}`;
  }
  if (priceLte !== null) {
      queryString += `&price=lte.${priceLte}`;
  }


  // Construct the URL for the database API request
  const databaseURL = `${baseURL}/rest/v1/mobile_numbers?select=*${queryString}`;

  try {
    // Make an HTTP GET request to the database API
    const response = await fetch(databaseURL, {
      method: 'GET',
      headers: {
          'apikey': context.env.MOBILE_DATABASE_API_KEY,
        },
    });

    // Check if the response is successful
    if (response.ok) {
      // Read and return the response body
      const responseBody = await response.text();
      return new Response(responseBody, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
    } else {
      // Handle the case where the database API returns an error
      return new Response(`Error fetching memorable numbers: ${response.statusText}`, {
        status: response.status,
        statusText: response.statusText,
      });
    }
  } catch (error) {
    // Handle any unexpected errors
    return new Response(`Error fetching memorable numbers: ${error.message}`, { status: 500 });
  }
}
