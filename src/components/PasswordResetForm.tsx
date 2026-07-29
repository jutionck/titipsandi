"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Eye, EyeOff, Lock, Shield } from "lucide-react";

export default function PasswordResetForm() {
  const tokenRef = useRef("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const passwordIsLongEnough = password.length >= 12;
  const passwordsMatch = confirmation.length > 0 && password === confirmation;
  const canSubmit = passwordIsLongEnough && passwordsMatch && !loading;

  useEffect(() => {
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    tokenRef.current = fragment.get("token") || "";
    window.history.replaceState(null, "", "/recover");
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!tokenRef.current) {
      setError("Tautan pemulihan tidak valid.");
      return;
    }
    if (password !== confirmation) {
      setError("Konfirmasi password tidak cocok.");
      return;
    }
    if (password.length < 12) {
      setError("Password harus memiliki minimal 12 karakter.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/recovery/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: tokenRef.current, password }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error || "Password belum dapat diperbarui.");
        return;
      }
      setPassword("");
      setConfirmation("");
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
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Buat password baru</h1>
          <p className="text-sm leading-relaxed text-gray-500">
            Setelah berhasil, seluruh sesi lama akan dicabut dan Anda perlu masuk kembali.
          </p>
        </div>

        {message ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-green-200 bg-green-50 p-3 text-xs font-medium text-green-800">
              {message}
            </div>
            <Link
              href="/login"
              className="block w-full rounded-xl bg-gray-900 py-3 text-center text-sm font-semibold text-white shadow-md"
            >
              Masuk kembali
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700">
                {error}
              </div>
            )}

            <div className="space-y-1">
              <label htmlFor="new-password" className="text-xs font-semibold text-gray-600">
                Password baru
              </label>
              <div className="relative">
                <Lock className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  id="new-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  minLength={12}
                  maxLength={72}
                  autoComplete="new-password"
                  placeholder="Minimal 12 karakter"
                  aria-describedby="password-requirements"
                  className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pr-10 pl-9 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-transparent focus:ring-2 focus:ring-gray-900"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 transition hover:text-gray-700"
                  aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                  aria-pressed={showPassword}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p
                id="password-requirements"
                className={`text-xs ${
                  password.length > 0 && !passwordIsLongEnough ? "text-red-600" : "text-gray-500"
                }`}
              >
                Gunakan minimal 12 karakter dan hindari password yang pernah digunakan.
              </p>
            </div>

            <div className="space-y-1">
              <label htmlFor="confirm-password" className="text-xs font-semibold text-gray-600">
                Konfirmasi password baru
              </label>
              <div className="relative">
                <Lock className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  id="confirm-password"
                  type={showConfirmation ? "text" : "password"}
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                  required
                  minLength={12}
                  maxLength={72}
                  autoComplete="new-password"
                  placeholder="Ulangi password baru"
                  aria-describedby={confirmation ? "password-match-status" : undefined}
                  className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pr-10 pl-9 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-transparent focus:ring-2 focus:ring-gray-900"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmation((visible) => !visible)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 transition hover:text-gray-700"
                  aria-label={
                    showConfirmation
                      ? "Sembunyikan konfirmasi password"
                      : "Tampilkan konfirmasi password"
                  }
                  aria-pressed={showConfirmation}
                >
                  {showConfirmation ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {confirmation && (
                <p
                  id="password-match-status"
                  role="status"
                  className={`text-xs font-medium ${
                    passwordsMatch ? "text-green-700" : "text-red-600"
                  }`}
                >
                  {passwordsMatch ? "Password cocok." : "Password belum cocok."}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full rounded-xl bg-gray-900 py-3 text-sm font-semibold text-white shadow-md shadow-gray-900/10 transition hover:bg-gray-800 disabled:opacity-50"
            >
              {loading ? "Memperbarui..." : "Perbarui password"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
