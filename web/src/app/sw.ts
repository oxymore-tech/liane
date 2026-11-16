import type { PrecacheEntry } from "serwist";
import { Serwist } from "serwist";

declare const self: ServiceWorkerGlobalScope & {
  __SW_MANIFEST: (PrecacheEntry | string)[];
};

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
});

serwist.addEventListeners();

const ICON = "/web-app-manifest-192x192.png";

/** Ce que le serveur envoie (`PushNotification` côté API). */
type PushPayload = {
  title?: string;
  body?: string;
  url?: string;
  tag?: string;
};

const readPayload = (event: PushEvent): PushPayload => {
  try {
    return event.data?.json() ?? {};
  } catch {
    return { body: event.data?.text() };
  }
};

// Une notification doit toujours être affichée à la réception d'un push, même sans contenu lisible.
// Celles d'un même sujet (même `tag`) se remplacent : un trajet ou un fil ne s'empile pas.
self.addEventListener("push", (event: PushEvent) => {
  const payload = readPayload(event);
  event.waitUntil(
    self.registration.showNotification(payload.title || "Liane", {
      body: payload.body || "",
      icon: ICON,
      badge: ICON,
      tag: payload.tag || "liane",
      data: { url: payload.url || "/" },
    }),
  );
});

// Toucher la notification ramène à l'application, sur l'écran concerné.
self.addEventListener("notificationclick", (event: NotificationEvent) => {
  event.notification.close();
  const target = new URL(
    event.notification.data?.url || "/",
    self.location.origin,
  );

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      const open = windows.find(
        (client) => new URL(client.url).origin === target.origin,
      );
      if (!open) {
        await self.clients.openWindow(target.href);
        return;
      }
      await open.focus();
      if (open.url !== target.href) {
        await open.navigate(target.href).catch(() => {
          self.clients.openWindow(target.href);
        });
      }
    })(),
  );
});
