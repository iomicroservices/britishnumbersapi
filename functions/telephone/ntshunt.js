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
    case '/telephone/ntshunt/':
        return listHuntGroup(request, url);
    case '/telephone/ntshunt/new/':
      return newHuntGroup(request, url);
    case '/telephone/ntshunt/update/':
      return updateHuntGroup(request, url);
    case '/telephone/ntshunt/delete/':
      return deleteHuntGroup(request, url);
    default:
      return new Response('Not Found', { status: 404 });
  }
}

async function listHuntGroup(request, url) {
  const destinationURL = baseURL + '/ntshunt' + url.search;
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

async function newHuntGroup(request, url) {
  const destinationURL = baseURL + '/ntshunt/new' + url.search;
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
async function updateHuntGroup(request, url) {
  const destinationURL = baseURL + '/ntshunt/update' + url.search;
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
async function deleteHuntGroup(request, url) {
  const destinationURL = baseURL + '/ntshunt/delete' + url.search;
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
