"use client";

import Link from "next/link";
import { ChevronRight, Info, ShieldCheck } from "lucide-react";

import BottomNav from "@/components/BottomNav";
import DashboardDesktopNav from "@/components/DashboardDesktopNav";
import LogoutButton from "@/components/LogoutButton";
import PasskeySettings from "@/components/PasskeySettings";
import SecurityActivity from "@/components/SecurityActivity";
import SessionManagement from "@/components/SessionManagement";
import TotpSettings from "@/components/TotpSettings";

export default function SecurityPage() {
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

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            <TotpSettings />
            <PasskeySettings />
            <SessionManagement />
          </div>
          <div className="space-y-6">
            <SecurityActivity />

            <Link
              href="/info"
              className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-4 text-gray-700 shadow-sm transition hover:border-gray-300 hover:bg-gray-50"
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
