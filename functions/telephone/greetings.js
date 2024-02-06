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
    case '/telephone/greetings/':
        return listGreetings(request, url);
    case '/telephone/greetings/new/':
      return newGreetings(request, url);
    case '/telephone/greetings/update/':
      return updateGreetings(request, url);
    case '/telephone/greetings/delete/':
      return deleteGreetings(request, url);
    default:
      return new Response('Not Found', { status: 404 });
  }
}

async function listGreetings(request, url) {
  const destinationURL = baseURL + '/greetings' + url.search;
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

async function newGreetings(request, url) {
  const destinationURL = baseURL + '/greetings/new' + url.search;
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
async function updateGreetings(request, url) {
  const destinationURL = baseURL + '/greetings/update' + url.search;
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
async function deleteGreetings(request, url) {
  const destinationURL = baseURL + '/greetings/delete' + url.search;
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
