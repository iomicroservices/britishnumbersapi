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
    case '/telephone/purchase/switchboard/':
      return purchaseSwitchboard(request, url);
    case '/telephone/purchase/callwhisper/':
      return purchaseCallwhisper(request, url);
    case '/telephone/purchase/number/':
      return purchaseNumber(request, url);
    default:
      return new Response('Not Found', { status: 404 });
  }
}

async function purchaseSwitchboard(request, url) {
  const destinationURL = baseURL + '/purchase/switchboard' + url.search;
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
async function purchaseCallwhisper(request, url) {
  const destinationURL = baseURL + '/purchase/callwhisper' + url.search;
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
async function purchaseNumber(request, url) {
  const destinationURL = baseURL + '/purchase/number' + url.search;
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
