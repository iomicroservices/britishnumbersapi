addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const url = new URL(request.url);
  const path = url.pathname;
  const params = url.searchParams;
  const baseURL = context.env.TELEPHONE_BASE_URL;

  // Routing based on the path
  if (path.startsWith('/telephone/numbers/tariffs/')) {
    return listTariffs(request, url);
  } else if (path.startsWith('/telephone/numbers/')) {
    return listNumbers(request, url);
  } else if (path.startsWith('/telephone/numbers/config/')) {
    return listNumberConfig(request, url);
  } else if (path.startsWith('/telephone/numbers/available/')) {
    return listAvailableNumbers(request, url);
  } else if (path.startsWith('/telephone/numbers/update/')) {
    return updateNumberConfig(request, url);
  } else {
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
  const numberFromPath = url.pathname.split('/').pop(); // Extract the number from the path
  const destinationURL = baseURL + '/list/number/' + numberFromPath;
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
  const numberFromPath = url.pathname.split('/').pop(); // Extract the number from the path
  const destinationURL = baseURL + '/list/available' + numberFromPath;
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
