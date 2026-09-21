"use client";

import { useCallback, useEffect, useState } from "react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

type NavigatorWithStandalone = Navigator & { standalone?: boolean };

function isRunningStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches
    || (window.navigator as NavigatorWithStandalone).standalone === true;
}

export default function InstallAppButton({ variant = "site" }: { variant?: "site" | "admin" }) {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(true);

  useEffect(() => {
    const displayMode = window.matchMedia("(display-mode: standalone)");
    const updateDisplayMode = () => {
      const standalone = isRunningStandalone();
      setIsStandalone(standalone);
      if (standalone) setInstallPrompt(null);
    };
    const captureInstallPrompt = (event: Event) => {
      event.preventDefault();
      if (!isRunningStandalone()) setInstallPrompt(event as InstallPromptEvent);
    };
    const handleInstalled = () => {
      setInstallPrompt(null);
      setIsStandalone(true);
    };

    updateDisplayMode();
    window.addEventListener("beforeinstallprompt", captureInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);
    displayMode.addEventListener("change", updateDisplayMode);

    return () => {
      window.removeEventListener("beforeinstallprompt", captureInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
      displayMode.removeEventListener("change", updateDisplayMode);
    };
  }, []);

  const install = useCallback(async () => {
    if (!installPrompt) return;
    setInstallPrompt(null);
    await installPrompt.prompt();
    await installPrompt.userChoice;
  }, [installPrompt]);

  if (isStandalone || !installPrompt) return null;

  return (
    <button
      type="button"
      className={`install-app-button install-app-button--${variant}`}
      onClick={install}
      aria-label="Instalar app"
    >
      <span className="install-app-button__icon" aria-hidden="true">⇩</span>
      <span className="install-app-button__label">Instalar app</span>
    </button>
  );
}
