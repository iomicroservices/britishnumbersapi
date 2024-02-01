// /functions/memorable.js
export async function onRequestGet(context) {
  const { request, env, params } = context;
  const url = new URL(request.url);
  
  // Append only the search parameters to the base URL
  const destinationURL = 'https://hook.eu1.make.com/g7a4mpb8qoscy7sigi5o0co4xut3q0j1' + url.search;
  const init = {
    method: 'GET',
    headers: request.headers,
  };
  const response = await fetch(destinationURL, init);
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}
