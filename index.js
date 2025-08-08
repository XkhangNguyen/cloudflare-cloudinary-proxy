addEventListener("fetch", event => {
  event.respondWith(handleRequest(event))
})

const CLOUD_URL = `https://res.cloudinary.com/${CLOUD_NAME}/image`;

async function serveAsset(event) {
  const url = new URL(event.request.url);
  const cache = caches.default;

  let response = await cache.match(event.request);

  if (!response) {
    console.log("Cache miss");
    const cloudinaryURL = `${CLOUD_URL}${url.pathname}`;
    console.log(`Proxying to Cloudinary: ${cloudinaryURL}`);

    response = await fetch(cloudinaryURL, { headers: event.request.headers })
    const headers = new Headers(response.headers);
    headers.set("cache-control", `public, max-age=31536000`);
    headers.set("vary", "Accept");
    response = new Response(response.body, { ...response, headers })
    event.waitUntil(cache.put(event.request, response.clone()))
  } else {
    console.log("Cache hit");
  }

  return response;
}



async function handleRequest(event) {
  console.log('Requesting the image')
  if (event.request.method === "GET") {
    let response = await serveAsset(event)
    if (response.status > 399) {
      response = new Response(response.statusText, { status: response.status })
    }
    return response
  } else {
    return new Response("Method not allowed", { status: 405 })
  }
}
