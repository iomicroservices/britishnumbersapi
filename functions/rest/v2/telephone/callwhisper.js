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
    case '/telephone/callwhisper/':
        return listCallwhisper(request, url);
    case '/telephone/callwhisper/new/':
      return newCallwhisper(request, url);
    case '/telephone/callwhisper/update/':
      return updateCallwhisper(request, url);
    case '/telephone/callwhisper/delete/':
      return deleteCallwhisper(request, url);
    default:
      return new Response('Not Found', { status: 404 });
  }
}

async function listCallwhisper(request, url) {
  const destinationURL = baseURL + '/callwhisper' + url.search;
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

async function newCallwhisper(request, url) {
  const destinationURL = baseURL + '/callwhisper/new' + url.search;
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
async function updateCallwhisper(request, url) {
  const destinationURL = baseURL + '/callwhisper/update' + url.search;
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
async function deleteCallwhisper(request, url) {
  const destinationURL = baseURL + '/callwhisper/delete' + url.search;
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
