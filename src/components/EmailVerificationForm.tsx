"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MailCheck, Shield } from "lucide-react";

export default function EmailVerificationForm() {
  const tokenRef = useRef("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    tokenRef.current = new URLSearchParams(window.location.hash.slice(1)).get("token") || "";
    window.history.replaceState(null, "", "/verify-email");
  }, []);

  async function verify() {
    if (!tokenRef.current) {
      setError("Tautan verifikasi tidak valid.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/auth/email/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: tokenRef.current }),
      });
      const result = await response.json();
      if (!response.ok) setError(result.error);
      else setMessage(result.message);
    } catch {
      setError("Gagal terhubung ke server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-sm space-y-5 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-gray-900 text-white">
          {message ? <MailCheck className="h-6 w-6" /> : <Shield className="h-6 w-6" />}
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Verifikasi Email</h1>
        {message ? (
          <>
            <p className="rounded-xl border border-green-200 bg-green-50 p-3 text-xs font-semibold text-green-800">
              {message}
            </p>
            <Link
              href="/login"
              className="block rounded-xl bg-gray-900 py-3 text-sm font-bold text-white"
            >
              Masuk
            </Link>
          </>
        ) : (
          <>
            <p className="text-sm text-gray-500">
              Aktifkan akun sebelum login. Tautan hanya dapat digunakan sekali.
            </p>
            {error && (
              <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
                {error}
              </p>
            )}
            <button
              type="button"
              onClick={verify}
              disabled={loading}
              className="w-full rounded-xl bg-gray-900 py-3 text-sm font-bold text-white disabled:opacity-50"
            >
              {loading ? "Memverifikasi..." : "Verifikasi Email"}
            </button>
          </>
        )}
      </div>
    </main>
  );
}
