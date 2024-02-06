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

async function tariffPrices(request, url) {
  const destinationURL = baseURL + '/list/prices/tariff' + url.search;
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

async function whisperPrices(request, url) {
  const destinationURL = baseURL + '/list/prices/whisper' + url.search;
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
async function vsbPrices(request, url) {
  const destinationURL = baseURL + '/list/prices/vsb' + url.search;
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
async function tconnectPrices(request, url) {
  const destinationURL = baseURL + '/list/prices/tconnect' + url.search;
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
async function recordingPrices(request, url) {
  const destinationURL = baseURL + '/list/prices/recording' + url.search;
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