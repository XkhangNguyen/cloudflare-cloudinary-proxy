// Based on https://developers.cloudflare.com/workers/tutorials/configure-your-cdn

addEventListener("fetch", event => {
  event.respondWith(handleRequest(event))
})

const CLOUD_URL = `https://res.cloudinary.com`;

async function serveAsset(event) {
  const url = new URL(event.request.url);
  const cache = caches.default;

  let response = await cache.match(event.request);

  if (!response) {
    console.log("Cache miss");

    const cloudinaryURL = `${CLOUD_URL}${url.pathname}`;
    console.log(`Proxying to Cloudinary: ${cloudinaryURL}`);

    const originResponse = await fetch(cloudinaryURL, {
      headers: {
        "Accept": event.request.headers.get("Accept") || "*/*",
      },
    });

    if (originResponse.status >= 400) {
      console.log(`Cloudinary error: ${originResponse.status} ${originResponse.statusText}`);
    }

    const headers = new Headers(originResponse.headers);
    headers.set("Cache-Control", "public, max-age=31536000");
    headers.set("Vary", "Accept");
    headers.set("Access-Control-Allow-Origin", "*");

    response = new Response(originResponse.body, {
      status: originResponse.status,
      statusText: originResponse.statusText,
      headers,
    });

    if (originResponse.status < 400) {
      event.waitUntil(cache.put(event.request, response.clone()));
    }
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
