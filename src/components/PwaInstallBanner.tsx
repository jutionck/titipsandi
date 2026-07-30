"use client";

import { useEffect, useState } from "react";
import { Download, Share, Shield, X } from "lucide-react";
import { MOBILE_ONBOARDING_STORAGE_KEY } from "@/lib/mobile-onboarding";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
}

const DISMISS_KEY = "titipsandi-pwa-banner-dismissed-at";
const DISMISS_DURATION = 7 * 24 * 60 * 60 * 1000;

export default function PwaInstallBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || window.location.hostname === "localhost") return;

    function registerServiceWorker() {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // PWA support is optional; registration failure must not block the vault.
      });
    }

    if (document.readyState === "complete") {
      registerServiceWorker();
      return;
    }

    window.addEventListener("load", registerServiceWorker, { once: true });
    return () => window.removeEventListener("load", registerServiceWorker);
  }, []);

  useEffect(() => {
    if (
      window.location.pathname === "/" &&
      localStorage.getItem(MOBILE_ONBOARDING_STORAGE_KEY) !== "completed"
    ) {
      return;
    }

    const navigatorWithStandalone = navigator as Navigator & {
      standalone?: boolean;
    };
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      navigatorWithStandalone.standalone === true;

    if (isStandalone) return;

    const iosDevice =
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const mobileDevice =
      iosDevice ||
      /Android|Mobile/i.test(navigator.userAgent) ||
      window.matchMedia("(max-width: 767px) and (pointer: coarse)").matches;

    if (!mobileDevice) return;

    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY));
    if (Number.isFinite(dismissedAt) && Date.now() - dismissedAt < DISMISS_DURATION) {
      return;
    }

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setIsIos(iosDevice);
      setInstallPrompt(event as BeforeInstallPromptEvent);
      setIsVisible(true);
    }

    function handleAppInstalled() {
      setIsVisible(false);
      setInstallPrompt(null);
      localStorage.removeItem(DISMISS_KEY);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    const showTimer = window.setTimeout(() => {
      setIsIos(iosDevice);
      setIsVisible(true);
    }, 1200);

    return () => {
      window.clearTimeout(showTimer);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  function dismissBanner() {
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
    setIsVisible(false);
  }

  async function installApp() {
    if (!installPrompt) {
      dismissBanner();
      return;
    }

    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
    dismissBanner();
  }

  if (!isVisible) return null;

  const hasNativePrompt = installPrompt !== null;

  return (
    <aside
      aria-labelledby="pwa-install-title"
      className="fixed inset-x-3 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-80 mx-auto max-w-md rounded-2xl border border-gray-200 bg-white p-4 shadow-2xl sm:hidden"
    >
      <button
        type="button"
        onClick={dismissBanner}
        aria-label="Tutup banner instalasi"
        className="absolute right-2.5 top-2.5 rounded-full p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex gap-3 pr-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-900 text-white">
          <Shield className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1">
          <h2 id="pwa-install-title" className="text-sm font-extrabold text-gray-900">
            Install TitipSandi
          </h2>
          <p className="mt-1 text-[11px] leading-relaxed text-gray-500">
            {isIos
              ? "Ketuk tombol Bagikan di Safari, lalu pilih “Tambahkan ke Layar Utama”."
              : hasNativePrompt
                ? "Pasang sebagai aplikasi agar TitipSandi mudah dibuka dari layar utama."
                : "Buka menu browser, lalu pilih “Install aplikasi” atau “Tambahkan ke layar utama”."}
          </p>

          <button
            type="button"
            onClick={installApp}
            className="mt-3 inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-gray-900 px-3 py-2 text-[11px] font-bold text-white transition hover:bg-gray-800 active:scale-[0.98]"
          >
            {isIos ? <Share className="h-3.5 w-3.5" /> : <Download className="h-3.5 w-3.5" />}
            {hasNativePrompt ? "Install sekarang" : "Mengerti"}
          </button>
        </div>
      </div>
    </aside>
  );
}
