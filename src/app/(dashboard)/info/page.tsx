"use client";

import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import LogoutButton from "@/components/LogoutButton";
import {
  Info,
  ShieldCheck,
  Heart,
  Coffee,
  Lock,
  Terminal,
  ExternalLink,
  MessageSquare,
  Mail,
  Shield,
  Users,
  Plus,
} from "lucide-react";

export default function InfoPage() {
  const developerWhatsApp = process.env.NEXT_PUBLIC_DEVELOPER_WHATSAPP?.trim();
  const developerEmail = process.env.NEXT_PUBLIC_DEVELOPER_EMAIL?.trim();
  const developerDonationUrl =
    process.env.NEXT_PUBLIC_DEVELOPER_DONATION_URL?.trim() || "https://saweria.co";

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-24 sm:pb-6">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gray-900 text-white rounded-lg flex items-center justify-center">
              <Info className="w-4.5 h-4.5" />
            </div>
            <span className="font-extrabold text-gray-900 tracking-tight">Informasi Aplikasi</span>
          </div>

          {/* Desktop Nav */}
          <div className="hidden sm:flex items-center gap-4">
            <Link
              href="/dashboard"
              className="text-xs font-bold text-gray-500 hover:text-gray-900 flex items-center gap-1"
            >
              <Shield className="w-3.5 h-3.5" />
              Vault
            </Link>
            <Link
              href="/trusted"
              className="text-xs font-bold text-gray-500 hover:text-gray-900 flex items-center gap-1"
            >
              <Users className="w-3.5 h-3.5" />
              Kontak Darurat
            </Link>
            <Link
              href="/vault/new"
              className="text-xs font-bold text-gray-500 hover:text-gray-900 flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              Tambah
            </Link>
            <Link
              href="/info"
              className="text-xs font-bold text-gray-900 hover:text-gray-950 flex items-center gap-1"
            >
              <Info className="w-3.5 h-3.5" />
              Informasi
            </Link>
            <LogoutButton className="text-xs font-bold text-red-650 hover:text-red-750 flex items-center gap-1 cursor-pointer" />
          </div>

          <span className="sm:hidden text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-100 py-1 px-2.5 rounded-full">
            v1.0.0
          </span>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {/* Left Column: Info & Specs */}
          <div className="space-y-6">
            {/* App Info Card */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-3">
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="w-4.5 h-4.5 text-green-600" />
                <span>Tentang TitipSandi</span>
              </h2>
              <p className="text-xs text-gray-600 leading-relaxed">
                <strong>TitipSandi</strong> adalah aplikasi penyimpanan password dan PIN personal
                yang aman, ringkas, dan bebas iklan. Dirancang khusus untuk keperluan pribadi agar
                mempermudah keluarga terdekat (istri, anak, atau saudara) mengakses akun-akun
                penting Anda jika terjadi situasi darurat.
              </p>
            </div>

            {/* Security Specs */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4">
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                <Lock className="w-4.5 h-4.5 text-gray-600" />
                <span>Spesifikasi Keamanan</span>
              </h2>

              <div className="space-y-3 text-xs">
                <div className="p-3 bg-gray-50 rounded-xl space-y-1">
                  <div className="font-bold text-gray-800 flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5" />
                    <span>Enkripsi AES-256-GCM</span>
                  </div>
                  <p className="text-gray-500 leading-relaxed">
                    Field sensitif dienkripsi di server aplikasi menggunakan AES-256-GCM sebelum
                    disimpan. Database saja tidak cukup untuk membacanya, tetapi server yang
                    memegang kunci tetap dapat melakukan dekripsi.
                  </p>
                </div>

                <div className="p-3 bg-gray-50 rounded-xl space-y-1">
                  <div className="font-bold text-gray-800 flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5" />
                    <span>Akses Darurat Terenkripsi</span>
                  </div>
                  <p className="text-gray-500 leading-relaxed">
                    Akses darurat menggunakan kode acak 128-bit yang hanya ditampilkan sekali.
                    Server menyimpan hash kode; siapa pun yang memegang kode tetap dapat membuka
                    vault terkait.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Support & Feedback */}
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 text-white rounded-2xl p-5 shadow-md space-y-4">
              <div className="flex items-center gap-2 text-amber-400">
                <Coffee className="w-5 h-5" />
                <h2 className="text-sm font-bold uppercase tracking-wider">Dukung Developer</h2>
              </div>

              <p className="text-xs text-gray-300 leading-relaxed">
                Jika TitipSandi bermanfaat, Anda dapat mendukung pengembangan proyek open-source ini
                melalui Saweria.
              </p>

              <div className="pt-2">
                <a
                  href={developerDonationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 bg-white/10 hover:bg-white/15 rounded-xl transition text-xs font-semibold max-w-sm mx-auto"
                >
                  <span className="flex items-center gap-2">
                    <Heart className="w-4 h-4 text-red-400" />
                    Dukung lewat Saweria
                  </span>
                  <ExternalLink className="w-3.5 h-3.5 opacity-60" />
                </a>
              </div>
            </div>

            {/* Feedback & Feature Request */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2 text-gray-900">
                <MessageSquare className="w-5 h-5 text-gray-605" />
                <h2 className="text-sm font-bold uppercase tracking-wider">
                  Kritik, Saran & Fitur
                </h2>
              </div>

              <p className="text-xs text-gray-500 leading-relaxed">
                Gunakan issue atau discussion pada repository asal untuk mengusulkan fitur dan
                melaporkan bug non-keamanan.
              </p>

              <div className="grid grid-cols-1 gap-2">
                {developerWhatsApp && (
                  <a
                    href={`https://wa.me/${developerWhatsApp}?text=${encodeURIComponent("Halo, saya ingin memberikan feedback untuk TitipSandi")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 border border-gray-150 rounded-xl transition text-xs font-semibold text-gray-700"
                  >
                    <span className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-green-550" />
                      WhatsApp Maintainer
                    </span>
                    <ExternalLink className="w-3.5 h-3.5 opacity-65" />
                  </a>
                )}

                {developerEmail && (
                  <a
                    href={`mailto:${developerEmail}?subject=Feedback%20TitipSandi`}
                    className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 border border-gray-150 rounded-xl transition text-xs font-semibold text-gray-700"
                  >
                    <span className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-blue-550" />
                      Email Maintainer
                    </span>
                    <ExternalLink className="w-3.5 h-3.5 opacity-65" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Mobile-Only Logout Button */}
        <LogoutButton
          label="Keluar dari Akun"
          iconClassName="w-4 h-4"
          className="sm:hidden w-full py-3.5 bg-white border border-red-200 text-red-600 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-red-50 transition cursor-pointer shadow-sm"
        />
      </main>

      <BottomNav />
    </div>
  );
}
