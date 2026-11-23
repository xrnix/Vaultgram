self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  if (url.pathname.startsWith("/stream/")) {
    event.respondWith(handleStreamRequest(event, url));
  }
});

async function handleStreamRequest(event, url) {
  const request = event.request;
  // Extract clean file ID without query parameters
  const rawId = url.pathname.replace(/^\/stream\//, "");
  const fileId = decodeURIComponent(rawId);
  const rangeHeader = request.headers.get("Range");

  // Prefer the exact window client that issued the media request (fixes multi-tab & DevTools focus issues)
  let client = null;
  if (event.clientId) {
    try {
      client = await self.clients.get(event.clientId);
    } catch (_) {}
  }

  if (!client) {
    const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    if (!clients || clients.length === 0) {
      return new Response("No active Vaultgram window to fetch MTProto chunks", {
        status: 503,
        headers: { "Content-Type": "text/plain" },
      });
    }
    client = clients.find((c) => c.focused) || clients[0];
  }

  return new Promise((resolve) => {
    const channel = new MessageChannel();
    let isResolved = false;

    const cleanup = () => {
      clearTimeout(timeoutTimer);
      try {
        channel.port1.onmessage = null;
        channel.port1.close();
      } catch (_) {}
    };

    // 90-second safeguard covers worst-case initial transatlantic DH handshake + auth import + chunk fetch
    const timeoutTimer = setTimeout(() => {
      if (!isResolved) {
        isResolved = true;
        try {
          channel.port1.postMessage({ type: "ABORT" });
        } catch (_) {}
        cleanup();
        resolve(
          new Response("MTProto streaming request timed out", {
            status: 504,
            headers: { "Content-Type": "text/plain" },
          })
        );
      }
    }, 90000);

    // Cancel / abort propagation if browser cancels the media request (e.g. seeking or closing)
    if (request.signal) {
      request.signal.addEventListener(
        "abort",
        () => {
          if (!isResolved) {
            isResolved = true;
            try {
              channel.port1.postMessage({ type: "ABORT" });
            } catch (_) {}
            cleanup();
            resolve(new Response(null, { status: 499, statusText: "Client Closed Request" }));
          }
        },
        { once: true }
      );
    }

    channel.port1.onmessage = (msgEvent) => {
      if (isResolved) return;
      isResolved = true;
      cleanup();

      const { status, headers, body, error } = msgEvent.data;
      if (error) {
        if (error === "ABORTED") {
          resolve(new Response(null, { status: 499, statusText: "Client Closed Request" }));
          return;
        }
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
