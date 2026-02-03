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
    case '/telephone/holiday':
        return listHoliday(request, url);
    case '/telephone/holiday/new':
      return newHoliday(request, url);
    case '/telephone/holiday/update':
      return updateHoliday(request, url);
    case '/telephone/holiday/delete':
      return deleteHoliday(request);
    default:
      return new Response('Not Found', { status: 404 });
  }
}

async function listHoliday(request, url) {
  const destinationURL = baseURL + '/holiday' + url.search;
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

async function newHoliday(request, url) {
  const destinationURL = baseURL + '/holiday/new' + url.search;
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


async function updateHoliday(request, url) {
  // Extract query parameters
  const id = params.get('id');
  const Description = params.get('Description');
  const huntid = params.get('huntid');
  const days = params.get ('days');
  
  // Validate the URL parameters
  const errors = [];
  if (!id || id.trim() === '') {
    errors.push('Missing or blank "id" parameter', { status: 400 });
  }
  
  if (!isValidJSON(days)) {
    errors.push('Invalid "days" parameter. It should be a valid JSON object.');
  }
  
  if (errors.length > 0) {
    return new Response(errors.join('\n'), { status: 400 });
  }
  
  const destinationURL = baseURL + '/holiday/update' + url.search;
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


async function deleteHoliday(request, url) {
  const id = params.get('id');
  if (!id || id.trim() === '') {
    return new Response('Missing or blank "id" parameter', { status: 400 });
  }
  const destinationURL = baseURL + '/holiday/delete' + url.search;
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
