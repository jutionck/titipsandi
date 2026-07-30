"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ChevronRight,
  Fingerprint,
  HeartPulse,
  History,
  Info,
  KeyRound,
  Laptop,
  ShieldCheck,
} from "lucide-react";

import BottomNav from "@/components/BottomNav";
import DashboardDesktopNav from "@/components/DashboardDesktopNav";
import LogoutButton from "@/components/LogoutButton";
import PasskeySettings from "@/components/PasskeySettings";
import PasswordHealth from "@/components/PasswordHealth";
import SecurityActivity from "@/components/SecurityActivity";
import SessionManagement from "@/components/SessionManagement";
import TotpSettings from "@/components/TotpSettings";

type SecurityTab = "health" | "totp" | "passkey" | "sessions" | "activity";

const SECURITY_TABS = [
  { id: "health", label: "Kesehatan", icon: HeartPulse },
  { id: "totp", label: "Authenticator", icon: KeyRound },
  { id: "passkey", label: "Akses Cepat", icon: Fingerprint },
  { id: "sessions", label: "Perangkat & Sesi", icon: Laptop },
  { id: "activity", label: "Aktivitas", icon: History },
] satisfies Array<{ id: SecurityTab; label: string; icon: typeof HeartPulse }>;

export default function SecurityPage() {
  const [activeTab, setActiveTab] = useState<SecurityTab>("health");

  function selectAdjacentTab(event: React.KeyboardEvent<HTMLButtonElement>, current: SecurityTab) {
    const currentIndex = SECURITY_TABS.findIndex((tab) => tab.id === current);
    let nextIndex = currentIndex;

    if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % SECURITY_TABS.length;
    else if (event.key === "ArrowLeft")
      nextIndex = (currentIndex - 1 + SECURITY_TABS.length) % SECURITY_TABS.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = SECURITY_TABS.length - 1;
    else return;

    event.preventDefault();
    const nextTab = SECURITY_TABS[nextIndex].id;
    setActiveTab(nextTab);
    requestAnimationFrame(() => document.getElementById(`security-tab-${nextTab}`)?.focus());
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 pb-24 lg:pb-6">
      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-900 text-white">
              <ShieldCheck className="h-4.5 w-4.5" />
            </div>
            <div>
              <span className="block text-sm font-extrabold tracking-tight text-gray-900">
                Keamanan Akun
              </span>
              <span className="hidden text-[10px] text-gray-400 sm:block">
                Login, perangkat, dan aktivitas
              </span>
            </div>
          </div>

          <DashboardDesktopNav active="security" />
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-6">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-gray-900">Pusat keamanan</h1>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-gray-500">
            Kelola cara masuk, periksa perangkat aktif, dan tinjau aktivitas keamanan akun Anda.
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Bagian pusat keamanan"
          className="mx-auto hidden w-full max-w-4xl grid-cols-5 gap-1 rounded-2xl border border-gray-200 bg-gray-100 p-1.5 lg:grid"
        >
          {SECURITY_TABS.map((tab) => {
            const Icon = tab.icon;
            const selected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`security-tab-${tab.id}`}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls={`security-panel-${tab.id}`}
                tabIndex={selected ? 0 : -1}
                onClick={() => setActiveTab(tab.id)}
                onKeyDown={(event) => selectAdjacentTab(event, tab.id)}
                className={`flex min-w-0 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-bold transition ${
                  selected
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:bg-white/60 hover:text-gray-900"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="mx-auto w-full max-w-4xl space-y-6">
          <div
            id="security-panel-health"
            role="tabpanel"
            aria-labelledby="security-tab-health"
            className={activeTab === "health" ? "w-full lg:block" : "w-full lg:hidden"}
          >
            <PasswordHealth />
          </div>
          <div
            id="security-panel-totp"
            role="tabpanel"
            aria-labelledby="security-tab-totp"
            className={activeTab === "totp" ? "w-full lg:block" : "w-full lg:hidden"}
          >
            <TotpSettings />
          </div>
          <div
            id="security-panel-passkey"
            role="tabpanel"
            aria-labelledby="security-tab-passkey"
            className={activeTab === "passkey" ? "w-full lg:block" : "w-full lg:hidden"}
          >
            <PasskeySettings />
          </div>
          <div
            id="security-panel-sessions"
            role="tabpanel"
            aria-labelledby="security-tab-sessions"
            className={activeTab === "sessions" ? "w-full lg:block" : "w-full lg:hidden"}
          >
            <SessionManagement />
          </div>
          <div
            id="security-panel-activity"
            role="tabpanel"
            aria-labelledby="security-tab-activity"
            className={activeTab === "activity" ? "w-full lg:block" : "w-full lg:hidden"}
          >
            <SecurityActivity />
          </div>

          <Link
            href="/info"
            className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-4 text-gray-700 shadow-sm transition hover:border-gray-300 hover:bg-gray-50 lg:hidden"
          >
            <span className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100">
                <Info className="h-4.5 w-4.5" />
              </span>
              <span>
                <span className="block text-xs font-bold">Tentang TitipSandi</span>
                <span className="mt-0.5 block text-[10px] text-gray-500">
                  Spesifikasi, dukungan, dan feedback
                </span>
              </span>
            </span>
            <ChevronRight className="h-4 w-4 text-gray-400" />
          </Link>
        </div>

        <LogoutButton
          label="Keluar dari Akun"
          iconClassName="h-4 w-4"
          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border border-red-200 bg-white py-3.5 text-xs font-bold text-red-600 shadow-sm transition hover:bg-red-50 lg:hidden"
        />
      </main>

      <BottomNav />
    </div>
  );
}
