"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, KeyRound, Shield, UserCheck } from "lucide-react";
import MobileWelcome from "@/components/MobileWelcome";
import { MOBILE_ONBOARDING_STORAGE_KEY } from "@/lib/mobile-onboarding";

type MobileView = "pending" | "welcome" | "landing";

function Landing({ mobileOnly = false }: { mobileOnly?: boolean }) {
  return (
    <main
      className={`${mobileOnly ? "flex md:hidden" : "hidden md:flex"} min-h-screen flex-col justify-between bg-gradient-to-b from-gray-50 to-gray-100 px-4 py-8`}
    >
      <div />

      <div className="mx-auto w-full max-w-md space-y-8 text-center">
        <div className="space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-900 text-white shadow-lg">
            <Shield className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">TitipSandi</h1>
            <p className="mx-auto mt-2 max-w-xs text-sm text-gray-500">
              Simpan password dan PIN dengan enkripsi terautentikasi. Hubungkan dengan keluarga
              untuk akses darurat.
            </p>
          </div>
        </div>

        <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 text-left shadow-sm">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-gray-100 p-2 text-gray-700">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Enkripsi AES-256</h2>
              <p className="text-xs text-gray-500">
                Isi vault dienkripsi di browser sebelum dikirim dan disimpan ke database.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-gray-100 p-2 text-gray-700">
              <UserCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Kontak Terpercaya</h2>
              <p className="text-xs text-gray-500">
                Tentukan istri, anak, atau kerabat dekat yang bisa meminta akses.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <Link
            href="/login"
            className="block w-full rounded-xl bg-gray-900 px-4 py-3.5 text-sm font-semibold text-white shadow-md shadow-gray-900/10 transition hover:bg-gray-800 active:scale-[0.99]"
          >
            Masuk ke TitipSandi
          </Link>
          <Link
            href="/register"
            className="block w-full rounded-xl border border-gray-200 bg-white px-4 py-3.5 text-sm font-semibold text-gray-900 shadow-sm transition hover:bg-gray-50 active:scale-[0.99]"
          >
            Daftar Baru
          </Link>
        </div>
      </div>

      <div className="mx-auto w-full max-w-md border-t border-gray-200 pt-6 text-center">
        <Link
          href="/emergency"
          className="inline-flex items-center gap-2 rounded-lg bg-red-50 px-4 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-100 hover:text-red-700"
        >
          <AlertTriangle className="h-4 w-4" />
          Akses Darurat (Untuk Keluarga)
        </Link>
      </div>
    </main>
  );
}

export default function PublicHome() {
  const [mobileView, setMobileView] = useState<MobileView>("pending");
  const [replay, setReplay] = useState(false);

  useEffect(() => {
    const initializeView = window.setTimeout(() => {
      const forceWelcome = new URLSearchParams(window.location.search).get("welcome") === "1";
      let hasCompletedOnboarding = false;

      try {
        hasCompletedOnboarding =
          window.localStorage.getItem(MOBILE_ONBOARDING_STORAGE_KEY) === "completed";
      } catch {
        // Storage may be unavailable in strict privacy mode; onboarding can still be used.
      }

      setReplay(forceWelcome);
      setMobileView(forceWelcome || !hasCompletedOnboarding ? "welcome" : "landing");
    }, 0);

    return () => window.clearTimeout(initializeView);
  }, []);

  function completeOnboarding() {
    try {
      window.localStorage.setItem(MOBILE_ONBOARDING_STORAGE_KEY, "completed");
    } catch {
      // Navigation must remain available even when storage is blocked.
    }
  }

  return (
    <>
      <Landing />

      {mobileView === "pending" && (
        <div className="flex min-h-[100svh] items-center justify-center bg-gray-950 md:hidden">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-gray-950 shadow-xl">
            <Shield className="h-7 w-7" />
          </div>
          <span className="sr-only">Memuat TitipSandi</span>
        </div>
      )}

      {mobileView === "welcome" && (
        <MobileWelcome replay={replay} onComplete={completeOnboarding} />
      )}

      {mobileView === "landing" && <Landing mobileOnly />}
    </>
  );
}
