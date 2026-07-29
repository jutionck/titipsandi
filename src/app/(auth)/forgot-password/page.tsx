"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Mail, Shield } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/recovery/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error || "Permintaan belum dapat diproses.");
        return;
      }
      setMessage(result.message);
    } catch {
      setError("Gagal terhubung ke server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col justify-center bg-gray-50 p-6">
      <div className="mx-auto w-full max-w-sm space-y-6">
        <Link
          href="/login"
          className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-500 shadow-sm transition hover:text-gray-900"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Kembali ke login
        </Link>

        <div className="space-y-2 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-gray-900 text-white shadow-md">
            <Shield className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Pulihkan akun</h1>
          <p className="text-sm leading-relaxed text-gray-500">
            Kami akan mengirim tautan sekali pakai yang berlaku selama 10 menit.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {message && (
            <div className="rounded-xl border border-green-200 bg-green-50 p-3 text-xs font-medium text-green-800">
              {message}
            </div>
          )}
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700">
              {error}
            </div>
          )}

          <div className="space-y-1">
            <label htmlFor="recovery-email" className="text-xs font-semibold text-gray-600">
              Email akun
            </label>
            <div className="relative">
              <Mail className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                id="recovery-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                autoComplete="email"
                className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pr-4 pl-9 text-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-gray-900"
                placeholder="email@contoh.com"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || Boolean(message)}
            className="w-full rounded-xl bg-gray-900 py-3 text-sm font-semibold text-white shadow-md shadow-gray-900/10 transition hover:bg-gray-800 disabled:opacity-50"
          >
            {loading ? "Mengirim..." : "Kirim tautan pemulihan"}
          </button>
        </form>

        <p className="text-center text-[11px] leading-relaxed text-gray-400">
          Demi privasi, respons yang ditampilkan selalu sama meskipun alamat email tidak terdaftar.
        </p>
      </div>
    </main>
  );
}
