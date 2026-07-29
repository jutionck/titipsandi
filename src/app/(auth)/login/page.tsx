"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { startAuthentication } from "@simplewebauthn/browser";
import { Shield, Lock, Mail, ArrowLeft, Eye, EyeOff, Fingerprint } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }

      router.push("/dashboard");
    } catch {
      setError("Gagal terhubung ke server");
    } finally {
      setLoading(false);
    }
  }

  async function handlePasskeyLogin() {
    setError("");
    if (!email.trim()) {
      setError("Masukkan email terlebih dahulu untuk memakai passkey.");
      return;
    }
    if (!window.PublicKeyCredential || !window.isSecureContext) {
      setError("Passkey memerlukan browser modern melalui HTTPS.");
      return;
    }

    setPasskeyLoading(true);
    try {
      const optionsResponse = await fetch("/api/auth/passkeys/login/options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const options = await optionsResponse.json();
      if (!optionsResponse.ok) throw new Error(options.error);

      const authenticationResponse = await startAuthentication({
        optionsJSON: options,
      });
      const verifyResponse = await fetch("/api/auth/passkeys/login/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response: authenticationResponse }),
      });
      const result = await verifyResponse.json();
      if (!verifyResponse.ok) throw new Error(result.error);

      router.replace("/dashboard");
      router.refresh();
    } catch (caughtError) {
      const text =
        caughtError instanceof Error && caughtError.name !== "NotAllowedError"
          ? caughtError.message
          : "Login dengan passkey dibatalkan.";
      setError(text);
    } finally {
      setPasskeyLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-between p-6">
      <div className="w-full max-w-sm mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-gray-500 hover:text-gray-900 mb-8 py-1.5 px-3 bg-white border border-gray-200 rounded-full transition shadow-sm"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Kembali
        </Link>
      </div>

      <div className="max-w-sm w-full mx-auto space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 bg-gray-900 text-white rounded-xl flex items-center justify-center shadow-md">
            <Shield className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Selamat Datang</h2>
          <p className="text-sm text-gray-500">Masuk untuk mengakses brankas pribadi Anda</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-750 text-xs font-medium rounded-xl">
              {error}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-600">Email</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                <Mail className="w-4 h-4" />
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none text-sm transition"
                placeholder="email@contoh.com"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-600">Master Password</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-9 pr-10 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none text-sm transition"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-450 hover:text-gray-700 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gray-900 text-white rounded-xl font-semibold text-sm hover:bg-gray-800 active:scale-[0.99] transition disabled:opacity-50 shadow-md shadow-gray-900/10"
          >
            {loading ? "Memproses..." : "Masuk"}
          </button>
        </form>

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-gray-200" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">atau</span>
          <div className="h-px flex-1 bg-gray-200" />
        </div>

        <div className="space-y-2">
          <button
            type="button"
            onClick={handlePasskeyLogin}
            disabled={passkeyLoading || loading}
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white py-3 text-sm font-bold text-gray-800 shadow-sm transition hover:bg-gray-50 disabled:cursor-wait disabled:opacity-60"
          >
            <Fingerprint className="h-4.5 w-4.5" />
            {passkeyLoading ? "Memverifikasi..." : "Masuk dengan Passkey"}
          </button>
          <p className="text-center text-[10px] leading-relaxed text-gray-400">
            Face ID, sidik jari, Windows Hello, atau PIN perangkat setelah diaktifkan dari halaman
            Informasi.
          </p>
        </div>

        <p className="text-center text-xs text-gray-500">
          Belum punya akun?{" "}
          <Link href="/register" className="text-gray-900 font-bold hover:underline">
            Daftar
          </Link>
        </p>
      </div>

      <div />
    </div>
  );
}
