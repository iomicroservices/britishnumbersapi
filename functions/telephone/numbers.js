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
    case '/telephone/numbers/tariffs/':
        return listTariffs(request, url);
    case '/telephone/numbers/':
        return listNumbers(request, url);
    case '/telephone/numbers/config':
      return listNumberConfig(request, url);
    case '/telephone/numbers/available/':
      return listAvailableNumbers(request, url);
    case '/telephone/numbers/update/':
      return updateNumberConfig(request, url);
    default:
      return new Response('Not Found', { status: 404 });
  }
}

async function listTariffs(request, url) {
  const destinationURL = baseURL + '/list/tariffs' + url.search;
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

async function listNumbers(request, url) {
  const destinationURL = baseURL + '/list/numbers' + url.search;
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

async function listNumberConfig(request, url) {
  const destinationURL = baseURL + '/list/number' + url.search;
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

async function listAvailableNumbers(request, url) {
  const destinationURL = baseURL + '/list/available' + url.search;
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

async function updateNumberConfig(request, url) {
  const destinationURL = baseURL + '/manage/number' + url.search;
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
