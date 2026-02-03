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
    case '/telephone/switchboard/':
        return listSwitchboard(request, url);
    case '/telephone/switchboard/new/':
      return newSwitchboard(request, url);
    case '/telephone/switchboard/update/':
      return updateSwitchboard(request, url);
    case '/telephone/switchboard/delete/':
      return deleteSwitchboard(request, url);
    default:
      return new Response('Not Found', { status: 404 });
  }
}

async function listSwitchboard(request, url) {
  const destinationURL = baseURL + '/switchboard' + url.search;
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

async function newSwitchboard(request, url) {
  const destinationURL = baseURL + '/switchboard/new' + url.search;
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
async function updateSwitchboard(request, url) {
  const destinationURL = baseURL + '/switchboard/update' + url.search;
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
async function deleteSwitchboard(request, url) {
  const destinationURL = baseURL + '/switchboard/delete' + url.search;
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
