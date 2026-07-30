"use client";

import Link from "next/link";
import { Info, Plus, Shield, ShieldCheck, Users } from "lucide-react";

import LogoutButton from "@/components/LogoutButton";

type DashboardSection = "vault" | "trusted" | "security" | "info";

export default function DashboardDesktopNav({ active }: { active: DashboardSection }) {
  const linkClass = (section: DashboardSection) =>
    `flex items-center gap-1 text-xs font-bold ${
      active === section ? "text-gray-900" : "text-gray-500 hover:text-gray-900"
    }`;

  return (
    <nav className="hidden items-center gap-4 lg:flex" aria-label="Navigasi utama">
      <Link href="/dashboard" className={linkClass("vault")}>
        <Shield className="h-3.5 w-3.5" />
        Vault
      </Link>
      <Link href="/trusted" className={linkClass("trusted")}>
        <Users className="h-3.5 w-3.5" />
        Kontak Darurat
      </Link>
      <Link
        href="/vault/new"
        className="flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-gray-900"
      >
        <Plus className="h-3.5 w-3.5" />
        Tambah
      </Link>
      <Link href="/security" className={linkClass("security")}>
        <ShieldCheck className="h-3.5 w-3.5" />
        Keamanan
      </Link>
      <Link href="/info" className={linkClass("info")}>
        <Info className="h-3.5 w-3.5" />
        Informasi
      </Link>
      <LogoutButton className="flex cursor-pointer items-center gap-1 text-xs font-bold text-red-600 hover:text-red-700" />
    </nav>
  );
}
