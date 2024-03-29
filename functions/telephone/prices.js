export async function handleRequest(request) {
  const url = new URL(request.url);
  const path = url.pathname;
  const params = url.searchParams;
  const baseURL = context.env.TELEPHONE_BASE_URL

  // Routing based on the path
  switch (path) {
    case '/telephone/prices/tariff':
        return tariffPrices(baseURL, request);
    case '/telephone/prices/whisper':
      return whisperPrices(baseURL, request);
    case '/telephone/prices/vsb':
      return vsbPrices(baseURL, request);
    case '/telephone/prices/tconnect':
      return tconnectPrices(baseURL, request);
    case '/telephone/prices/recording':
      return recordingPrices(baseURL, request);
    default:
      return new Response('Not Found', { status: 404 });
  }
}

async function tariffPrices(baseURL, request) {
  const destinationURL = baseURL + '/list/prices/tariff';
  const init = {
    method: request.method,
    headers: request.headers,
  };

  try {
    const response = await fetch(destinationURL, init);
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  } catch (error) {
    return new Response(`Error fetching tariff prices: ${error.message}`, { status: 500 });
  }
}

async function whisperPrices(baseURL, request) {
  const destinationURL = baseURL + '/list/prices/whisper';
  const init = {
    method: request.method,
    headers: request.headers,
  };
  const response = await fetch(destinationURL, init);
  console.log('Response:', response.status);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}
async function vsbPrices(baseURL, request) {
  const destinationURL = baseURL + '/list/prices/vsb';
  const init = {
    method: request.method,
    headers: request.headers,
  };
  const response = await fetch(destinationURL, init);
  console.log('Response:', response.status);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}
async function tconnectPrices(baseURL, request) {
  const destinationURL = baseURL + '/list/prices/tconnect';
  const init = {
    method: request.method,
    headers: request.headers,
  };
  const response = await fetch(destinationURL, init);
  console.log('Response:', response.status);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}
async function recordingPrices(baseURL, request) {
  const destinationURL = baseURL + '/list/prices/recording';
  const init = {
    method: request.method,
    headers: request.headers,
  };
  const response = await fetch(destinationURL, init);
  console.log('Response:', response.status);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}
