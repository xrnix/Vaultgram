self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  if (url.pathname.startsWith("/stream/")) {
    event.respondWith(handleStreamRequest(event.request, url));
  }
});

async function handleStreamRequest(request, url) {
  // Extract clean file ID without query parameters
  const rawId = url.pathname.replace(/^\/stream\//, "");
  const fileId = decodeURIComponent(rawId);
  const rangeHeader = request.headers.get("Range");

  // Find all active window clients
  const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  if (!clients || clients.length === 0) {
    return new Response("No active Vaultgram window to fetch MTProto chunks", {
      status: 503,
      headers: { "Content-Type": "text/plain" },
    });
  }

  // Prioritize focused window, fallback to first available
  const client = clients.find((c) => c.focused) || clients[0];

  return new Promise((resolve) => {
    const channel = new MessageChannel();
    let isResolved = false;

    // Timeout safeguard after 30 seconds to prevent indefinite player hang
    const timeoutTimer = setTimeout(() => {
      if (!isResolved) {
        isResolved = true;
        try {
          channel.port1.close();
          channel.port2.close();
        } catch (_) {}
        resolve(
          new Response("MTProto streaming request timed out", {
            status: 504,
            headers: { "Content-Type": "text/plain" },
          })
        );
      }
    }, 30000);

    // Cancel / abort propagation if browser cancels the media request (e.g. seeking or closing)
    if (request.signal) {
      request.signal.addEventListener("abort", () => {
        if (!isResolved) {
          isResolved = true;
          clearTimeout(timeoutTimer);
          try {
            channel.port1.close();
            channel.port2.close();
          } catch (_) {}
          resolve(new Response(null, { status: 499, statusText: "Client Closed Request" }));
        }
      });
    }

    channel.port1.onmessage = (event) => {
      if (isResolved) return;
      isResolved = true;
      clearTimeout(timeoutTimer);

      const { status, headers, body, error } = event.data;
      if (error) {
        resolve(
          new Response(String(error), {
            status: 500,
            headers: { "Content-Type": "text/plain" },
          })
        );
        return;
      }

      try {
        const responseHeaders = new Headers(headers || {});
        if (!responseHeaders.has("Accept-Ranges")) {
          responseHeaders.set("Accept-Ranges", "bytes");
        }
        if (!responseHeaders.has("Cache-Control")) {
          responseHeaders.set("Cache-Control", "no-cache");
        }

        resolve(
          new Response(body, {
            status: status || (rangeHeader ? 206 : 200),
            headers: responseHeaders,
          })
        );
      } catch (err) {
        resolve(
          new Response(`Failed to construct response: ${err}`, {
            status: 500,
            headers: { "Content-Type": "text/plain" },
          })
        );
      }
    };

    client.postMessage(
      {
        type: "VAULTGRAM_STREAM_REQUEST",
        fileId,
        range: rangeHeader,
      },
      [channel.port2]
    );
  });
}
