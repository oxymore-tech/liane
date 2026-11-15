"use client";

import { useCallback, useEffect, useState } from "react";
import {
  deletePushSubscription,
  getPushConfig,
  savePushSubscription,
} from "@/api/push";
import { Button, Card, Notice } from "@/components/ui";

/**
 * `needs-install` : sur iPhone, les notifications n'existent que si le site a été ajouté à l'écran d'accueil.
 * `unavailable` : le serveur n'a pas de clé de notification, ou l'application n'est pas installable ici.
 */
type Status =
  | "loading"
  | "unsupported"
  | "needs-install"
  | "unavailable"
  | "blocked"
  | "off"
  | "on";

const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent);

const isInstalled = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  (navigator as { standalone?: boolean }).standalone === true;

const isSupported = () =>
  "serviceWorker" in navigator &&
  "PushManager" in window &&
  "Notification" in window;

const currentSubscription = async () => {
  const registration = await navigator.serviceWorker.getRegistration();
  return (await registration?.pushManager.getSubscription()) ?? null;
};

/** La clé publique du serveur arrive en base64 « URL » ; le navigateur l'attend en octets. */
const keyBytes = (base64Url: string) => {
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
};

/** À la déconnexion : cet appareil ne doit plus recevoir les notifications du compte. */
export async function forgetPushSubscription() {
  try {
    if (!isSupported()) return;
    const subscription = await currentSubscription();
    if (!subscription) return;
    await deletePushSubscription(subscription.endpoint);
    await subscription.unsubscribe();
  } catch {
    // sans réseau, l'abonnement sera repris par le prochain compte qui s'abonne sur cet appareil
  }
}

export function NotificationSettings() {
  const [status, setStatus] = useState<Status>("loading");
  const [serverKey, setServerKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!isSupported()) {
      setStatus(isIos() && !isInstalled() ? "needs-install" : "unsupported");
      return;
    }
    try {
      const { vapid_public_key: key } = await getPushConfig();
      const registration = await navigator.serviceWorker.getRegistration();
      if (!key || !registration) {
        setStatus("unavailable");
        return;
      }
      setServerKey(key);
      if (Notification.permission === "denied") {
        setStatus("blocked");
        return;
      }
      setStatus((await currentSubscription()) ? "on" : "off");
    } catch {
      setStatus("unavailable");
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const enable = async () => {
    if (!serverKey) return;
    setBusy(true);
    setError(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "blocked" : "off");
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: keyBytes(serverKey),
      });
      await savePushSubscription(subscription.toJSON());
      setStatus("on");
    } catch {
      setError("Les notifications n'ont pas pu être activées. Réessayez.");
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    setBusy(true);
    await forgetPushSubscription();
    setBusy(false);
    await refresh();
  };

  if (status === "loading" || status === "unavailable") return null;

  return (
    <Card className="flex flex-col gap-2">
      <h2 className="font-bold">Notifications</h2>
      {status === "off" && (
        <>
          <p className="text-sm text-gray-600">
            Pour être prévenu sur ce téléphone d'un nouveau trajet, d'un message
            ou d'un départ.
          </p>
          <Button disabled={busy} onClick={enable}>
            Recevoir les notifications
          </Button>
        </>
      )}
      {status === "on" && (
        <>
          <p className="text-sm text-gray-600">
            Les notifications sont activées sur cet appareil.
          </p>
          <Button variant="secondary" disabled={busy} onClick={disable}>
            Ne plus recevoir de notifications
          </Button>
        </>
      )}
      {status === "blocked" && (
        <p className="text-sm text-gray-600">
          Les notifications sont bloquées pour ce site. Vous pouvez les
          autoriser dans les réglages de votre navigateur.
        </p>
      )}
      {status === "needs-install" && (
        <p className="text-sm text-gray-600">
          Sur iPhone, les notifications ne fonctionnent que si Liane est sur
          votre écran d'accueil : dans Safari, touchez « Partager », puis « Sur
          l'écran d'accueil », et ouvrez Liane depuis sa nouvelle icône.
        </p>
      )}
      {status === "unsupported" && (
        <p className="text-sm text-gray-600">
          Ce navigateur ne permet pas de recevoir des notifications.
        </p>
      )}
      {error && <Notice>{error}</Notice>}
    </Card>
  );
}
