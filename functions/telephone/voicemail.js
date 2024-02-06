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
    case '/telephone/voicemail/':
        return listVoicemail(request, url);
    case '/telephone/voicemail/config/':
        return configVoicemail(request, url);
    case '/telephone/voicemail/new/':
        return newVoicemail(request, url);
    case '/telephone/voicemail/update/':
        return updateVoicemail(request, url);
    case '/telephone/voicemail/delete/':
        return deleteVoicemail(request, url);

    default:
      return new Response('Not Found', { status: 404 });
  }
}

async function listVoicemail(request, url) {
  const destinationURL = baseURL + '/voicemail' + url.search;
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

async function configVoicemail(request, url) {
  const destinationURL = baseURL + '/voicemail/config' + url.search;
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
async function newVoicemail(request, url) {
  const destinationURL = baseURL + '/voicemail/new' + url.search;
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
async function updateVoicemail(request, url) {
  const destinationURL = baseURL + '/voicemail/update' + url.search;
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
async function deleteVoicemail(request, url) {
  const destinationURL = baseURL + '/voicemail/delete' + url.search;
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
