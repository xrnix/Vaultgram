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

// Per-chunk inactivity timeout (60s covers transatlantic DC 1 initial handshake + chunk fetch).
// Only armed while actively waiting for HEADERS or a PULL-requested CHUNK, so paused streams never time out.
const CHUNK_INACTIVITY_TIMEOUT_MS = 60000;

async function handleStreamRequest(event, url) {
  const request = event.request;
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
    let isClosed = false;
    let streamController = null;
    let inactivityTimer = null;
    let pendingPulls = 0;

    const clearWatchdog = () => {
      if (inactivityTimer !== null) {
        clearTimeout(inactivityTimer);
        inactivityTimer = null;
      }
    };

    const closeChannel = (sendAbort) => {
      if (isClosed) return;
      isClosed = true;
      clearWatchdog();
      if (sendAbort) {
        try {
          channel.port1.postMessage({ type: "ABORT" });
        } catch (_) {}
      }
      try {
        channel.port1.onmessage = null;
        channel.port1.close();
      } catch (_) {}
    };

    const armWatchdog = (reason) => {
      clearWatchdog();
      inactivityTimer = setTimeout(() => {
        if (!isResolved) {
          isResolved = true;
          closeChannel(true);
          resolve(
            new Response(reason, {
              status: 504,
              headers: { "Content-Type": "text/plain" },
            })
          );
        } else if (streamController && !isClosed) {
          const ctrl = streamController;
          streamController = null;
          closeChannel(true);
          try {
            ctrl.error(new Error(reason));
          } catch (_) {}
        }
      }, CHUNK_INACTIVITY_TIMEOUT_MS);
    };

    // Arm watchdog while waiting for initial HEADERS + first chunk
    armWatchdog("MTProto streaming request timed out");

    // Propagate abort if browser cancels request before headers arrive
    if (request.signal) {
      request.signal.addEventListener(
        "abort",
        () => {
          if (!isResolved) {
            isResolved = true;
            closeChannel(true);
            resolve(new Response(null, { status: 499, statusText: "Client Closed Request" }));
          } else if (!isClosed) {
            const ctrl = streamController;
            streamController = null;
            closeChannel(true);
            if (ctrl) {
              try {
                ctrl.error(new Error("ABORTED"));
              } catch (_) {}
            }
          }
        },
        { once: true }
      );
    }

    channel.port1.onmessage = (msgEvent) => {
      if (isClosed) return;
      const data = msgEvent.data;
      if (!data) return;

      // Support both structured streaming messages (type: HEADERS/CHUNK/ERROR) and legacy fallback
      const msgType = data.type || (data.error ? "ERROR" : "LEGACY");

      if (msgType === "ERROR") {
        const errText = String(data.error || "Unknown streaming error");
        if (!isResolved) {
          isResolved = true;
          closeChannel(false);
          if (errText === "ABORTED") {
            resolve(new Response(null, { status: 499, statusText: "Client Closed Request" }));
          } else {
            resolve(
              new Response(errText, {
                status: 500,
                headers: { "Content-Type": "text/plain" },
              })
            );
          }
        } else {
          const ctrl = streamController;
          streamController = null;
          closeChannel(false);
          if (ctrl) {
            try {
              ctrl.error(new Error(errText));
            } catch (_) {}
          }
        }
        return;
      }

      if (msgType === "HEADERS") {
        if (isResolved) return;
        isResolved = true;
        clearWatchdog();

        const responseHeaders = new Headers(data.headers || {});
        if (!responseHeaders.has("Accept-Ranges")) {
          responseHeaders.set("Accept-Ranges", "bytes");
        }
        if (!responseHeaders.has("Cache-Control")) {
          responseHeaders.set("Cache-Control", "no-cache");
        }

        const status = data.status || (rangeHeader ? 206 : 200);

        // Fast-path for 1-chunk responses (tiny probes, 416, or small ranges)
        if (data.done) {
          closeChannel(false);
          resolve(
            new Response(data.firstChunk || new ArrayBuffer(0), {
              status,
              headers: responseHeaders,
            })
          );
          return;
        }

        // True streaming ReadableStream with 2-chunk IPC pipelining for multi-chunk HTTP 206 windows
        const firstChunkBytes = data.firstChunk ? new Uint8Array(data.firstChunk) : null;
        const stream = new ReadableStream(
          {
            start(controller) {
              streamController = controller;
              if (firstChunkBytes && firstChunkBytes.byteLength > 0) {
                controller.enqueue(firstChunkBytes);
              }
            },
            pull() {
              if (isClosed) return;
              pendingPulls++;
              armWatchdog("MTProto chunk pull timed out");
              try {
                channel.port1.postMessage({ type: "PULL" });
              } catch (_) {
                closeChannel(false);
              }
            },
            cancel() {
              streamController = null;
              closeChannel(true);
            },
          },
          { highWaterMark: 2 }
        );

        resolve(
          new Response(stream, {
            status,
            headers: responseHeaders,
          })
        );
        return;
      }

      if (msgType === "CHUNK") {
        pendingPulls = Math.max(0, pendingPulls - 1);
        if (pendingPulls === 0) {
          clearWatchdog();
        } else {
          armWatchdog("MTProto chunk pull timed out");
        }

        const ctrl = streamController;
        if (!ctrl) {
          closeChannel(true);
          return;
        }

        try {
          if (data.body && data.body.byteLength > 0) {
            ctrl.enqueue(new Uint8Array(data.body));
          }
          if (data.done) {
            streamController = null;
            closeChannel(false);
            ctrl.close();
          }
        } catch (_) {
          streamController = null;
          closeChannel(true);
        }
        return;
      }

      // Legacy single-payload fallback
      if (!isResolved) {
        isResolved = true;
        closeChannel(false);
        const responseHeaders = new Headers(data.headers || {});
        if (!responseHeaders.has("Accept-Ranges")) {
          responseHeaders.set("Accept-Ranges", "bytes");
        }
        if (!responseHeaders.has("Cache-Control")) {
          responseHeaders.set("Cache-Control", "no-cache");
        }
        resolve(
          new Response(data.body, {
            status: data.status || (rangeHeader ? 206 : 200),
            headers: responseHeaders,
          })
        );
      }
    };

    client.postMessage(
      {
        type: "VAULTGRAM_STREAM_REQUEST",
        fileId,
        range: rangeHeader,
        streamProtocol: 2,
      },
      [channel.port2]
    );
  });
}
