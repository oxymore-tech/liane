"use client";
import { useEffect, useState } from "react";
import { buttonClass } from "@/components/ui";

type Platform = "ios" | "android" | "desktop" | "unknown";

export const InstallPrompt = () => {
  const [platform, setPlatform] = useState<Platform>("unknown");
  const [_isStandalone, setIsStandalone] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches;
    setIsStandalone(standalone);

    const userAgent = navigator.userAgent.toLowerCase();
    const isIOSDevice =
      /ipad|iphone|ipod/.test(userAgent) && !(window as any).MSStream;
    const isAndroidDevice = /android/.test(userAgent);

    if (isIOSDevice) {
      setPlatform("ios");
    } else if (isAndroidDevice) {
      setPlatform("android");
    } else {
      setPlatform("desktop");
    }
  }, []);

  if (platform !== "ios" && platform !== "android") {
    return null;
  }

  return (
    <div className="flex flex-col gap-3 max-w-sm">
      <InstallPWAButton platform={platform} />

      {platform === "ios" && (
        <div className="rounded-card border border-bordure bg-white p-4">
          <button
            type="button"
            onClick={() => setShowInstructions(!showInstructions)}
            className="w-full flex items-center justify-between text-left font-semibold text-liane"
          >
            <span>Comment installer sur iOS ?</span>
            <span className="text-xl">{showInstructions ? "-" : "+"}</span>
          </button>

          {showInstructions && (
            <div className="mt-3 pt-3 border-t border-bordure">
              <ol className="list-decimal list-inside space-y-2 text-sm text-encre">
                <li>
                  Appuyez sur le bouton <strong>Partager</strong> (en bas de
                  Safari)
                </li>
                <li>Faites defiler vers le bas</li>
                <li>
                  Selectionnez <strong>"Sur l'ecran d'accueil"</strong>
                </li>
                <li>
                  Appuyez sur <strong>"Ajouter"</strong>
                </li>
              </ol>
            </div>
          )}
        </div>
      )}

      {platform === "android" && (
        <div className="rounded-card border border-bordure bg-white p-4">
          <button
            type="button"
            onClick={() => setShowInstructions(!showInstructions)}
            className="w-full flex items-center justify-between text-left font-semibold text-liane"
          >
            <span>Installation alternative</span>
            <span className="text-xl">{showInstructions ? "-" : "+"}</span>
          </button>

          {showInstructions && (
            <div className="mt-3 pt-3 border-t border-bordure">
              <p className="text-sm text-encre mb-2">
                Si le bouton ne fonctionne pas :
              </p>
              <ol className="list-decimal list-inside space-y-2 text-sm text-encre">
                <li>Appuyez sur le menu (3 points en haut a droite)</li>
                <li>
                  Selectionnez <strong>"Installer l'application"</strong> ou{" "}
                  <strong>"Ajouter a l'ecran d'accueil"</strong>
                </li>
              </ol>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

function InstallPWAButton({ platform }: { platform: Platform }) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setCanInstall(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    const installedHandler = () => {
      setCanInstall(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("appinstalled", installedHandler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      return;
    }

    setIsInstalling(true);

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setDeferredPrompt(null);
        setCanInstall(false);
      }
    } finally {
      setIsInstalling(false);
    }
  };

  if (!canInstall) {
    return null;
  }

  const text = isInstalling
    ? "Installation..."
    : platform === "ios"
      ? "Installer sur iOS"
      : platform === "android"
        ? "Installer sur Android"
        : "Installer l'application";

  return (
    <button
      type="button"
      onClick={handleInstall}
      disabled={isInstalling}
      className={buttonClass("primary")}
    >
      {text}
    </button>
  );
}
