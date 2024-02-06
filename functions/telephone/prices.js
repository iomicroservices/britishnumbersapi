addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const url = new URL(request.url);
  const path = url.pathname;
  const params = url.searchParams;
  const baseURL = context.env.TELEPHONE_BASE_URL

  // Routing based on the path
  switch (path) {
    case '/telephone/prices/tariff/':
        return tariffPrices(request, url);
    case '/telephone/prices/whisper/':
      return whisperPrices(request, url);
    case '/telephone/prices/vsb/':
      return vsbPrices(request, url);
    case '/telephone/prices/tconnect/':
      return tconnectPrices(request, url);
    case '/telephone/prices/recording/':
      return recordingPrices(request, url);
    default:
      return new Response('Not Found', { status: 404 });
  }
}

async function tariffPrices(request, baseURL) {
  const destinationURL = baseURL + '/list/prices/tariff';
  const init = {
    method: request.method,
    headers: request.headers,
  };
  const response = await fetch(destinationURL, init);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}

async function whisperPrices(request, baseURL) {
  const destinationURL = baseURL + '/list/prices/whisper';
  const init = {
    method: request.method,
    headers: request.headers,
  };
  const response = await fetch(destinationURL, init);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}
async function vsbPrices(request, baseURL) {
  const destinationURL = baseURL + '/list/prices/vsb';
  const init = {
    method: request.method,
    headers: request.headers,
  };
  const response = await fetch(destinationURL, init);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}
async function tconnectPrices(request, baseURL) {
  const destinationURL = baseURL + '/list/prices/tconnect';
  const init = {
    method: request.method,
    headers: request.headers,
  };
  const response = await fetch(destinationURL, init);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}
async function recordingPrices(request, baseURL) {
  const destinationURL = baseURL + '/list/prices/recording';
  const init = {
    method: request.method,
    headers: request.headers,
  };
  const response = await fetch(destinationURL, init);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}
