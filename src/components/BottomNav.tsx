"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Shield, Grid, Plus, Users, Info } from "lucide-react";

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 px-4 py-2 pb-safe shadow-lg">
      <div className="max-w-md mx-auto flex items-center justify-between">
        <Link
          href="/dashboard"
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition ${
            pathname === "/dashboard" ? "text-gray-900" : "text-gray-400 hover:text-gray-600"
          }`}
        >
          <Shield className="w-5.5 h-5.5" />
          <span className="text-[9px] font-bold">Vault</span>
        </Link>

        <Link
          href="/dashboard?categories=true"
          className="flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl text-gray-400 hover:text-gray-600 transition"
        >
          <Grid className="w-5.5 h-5.5" />
          <span className="text-[9px] font-bold">Kategori</span>
        </Link>

        <Link
          href="/vault/new"
          className="flex flex-col items-center justify-center w-12 h-12 bg-gray-900 hover:bg-gray-800 text-white rounded-full transition shadow-md active:scale-95 -mt-6 border-4 border-white"
        >
          <Plus className="w-6 h-6" />
        </Link>

        <Link
          href="/trusted"
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition ${
            pathname === "/trusted" ? "text-gray-900" : "text-gray-400 hover:text-gray-600"
          }`}
        >
          <Users className="w-5.5 h-5.5" />
          <span className="text-[9px] font-bold">Keluarga</span>
        </Link>

        <Link
          href="/info"
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition ${
            pathname === "/info" ? "text-gray-900" : "text-gray-400 hover:text-gray-600"
          }`}
        >
          <Info className="w-5.5 h-5.5" />
          <span className="text-[9px] font-bold">Info</span>
        </Link>
      </div>
    </div>
  );
}
