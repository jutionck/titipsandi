import Link from "next/link";
import { Shield, KeyRound, UserCheck, AlertTriangle } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex flex-col justify-between px-4 py-8">
      {/* Spacer */}
      <div />

      <div className="max-w-md w-full mx-auto text-center space-y-8">
        <div className="space-y-4">
          <div className="mx-auto w-16 h-16 bg-gray-900 text-white rounded-2xl flex items-center justify-center shadow-lg">
            <Shield className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">TitipSandi</h1>
            <p className="mt-2 text-sm text-gray-500 max-w-xs mx-auto">
              Simpan password dan PIN dengan enkripsi terautentikasi. Hubungkan dengan keluarga
              untuk akses darurat.
            </p>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4 text-left">
          <div className="flex gap-3 items-start">
            <div className="p-2 bg-gray-100 rounded-lg text-gray-700">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Enkripsi AES-256</h3>
              <p className="text-xs text-gray-500">
                Isi vault dienkripsi di browser sebelum dikirim dan disimpan ke database.
              </p>
            </div>
          </div>

          <div className="flex gap-3 items-start">
            <div className="p-2 bg-gray-100 rounded-lg text-gray-700">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Kontak Terpercaya</h3>
              <p className="text-xs text-gray-500">
                Tentukan istri, anak, atau kerabat dekat yang bisa meminta akses.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <Link
            href="/login"
            className="block w-full py-3.5 px-4 bg-gray-900 text-white rounded-xl font-semibold text-sm hover:bg-gray-800 active:scale-[0.99] transition shadow-md shadow-gray-900/10"
          >
            Masuk ke TitipSandi
          </Link>
          <Link
            href="/register"
            className="block w-full py-3.5 px-4 bg-white text-gray-900 border border-gray-200 rounded-xl font-semibold text-sm hover:bg-gray-50 active:scale-[0.99] transition shadow-sm"
          >
            Daftar Baru
          </Link>
        </div>
      </div>

      <div className="max-w-md w-full mx-auto text-center pt-6 border-t border-gray-200">
        <Link
          href="/emergency"
          className="inline-flex items-center gap-2 text-xs font-semibold text-red-600 hover:text-red-700 py-2 px-4 bg-red-50 hover:bg-red-100 rounded-lg transition"
        >
          <AlertTriangle className="w-4 h-4" />
          Akses Darurat (Untuk Keluarga)
        </Link>
      </div>
    </div>
  );
}
