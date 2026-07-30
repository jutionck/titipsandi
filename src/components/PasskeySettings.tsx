"use client";

import { useCallback, useEffect, useState } from "react";
import { startRegistration } from "@simplewebauthn/browser";
import { Eye, EyeOff, Fingerprint, LoaderCircle, ShieldCheck, Trash2 } from "lucide-react";
import { deriveAuthenticationSecret } from "@/lib/client-vault-crypto";

interface PasskeySummary {
  id: string;
  name: string;
  createdAt: string;
  lastUsedAt: string | null;
  backedUp: boolean;
}

function getDeviceName() {
  if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) return "iPhone / iPad";
  if (/Android/i.test(navigator.userAgent)) return "Perangkat Android";
  if (/Mac/i.test(navigator.userAgent)) return "Mac";
  if (/Windows/i.test(navigator.userAgent)) return "Windows";
  return "Perangkat pribadi";
}

export default function PasskeySettings() {
  const [passkeys, setPasskeys] = useState<PasskeySummary[]>([]);
  const [accountEmail, setAccountEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [masterPassword, setMasterPassword] = useState("");
  const [showMasterPassword, setShowMasterPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadPasskeys = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/passkeys");
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Akses cepat belum dapat dimuat.");
      }
      if (typeof data.email !== "string" || !data.email) {
        throw new Error("Identitas akun tidak valid.");
      }
      setPasskeys(data.passkeys || []);
      setAccountEmail(data.email);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : "Akses cepat belum dapat dimuat.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const load = async () => {
      await loadPasskeys();
    };
    if (active) {
      void load();
    }
    return () => {
      active = false;
    };
  }, [loadPasskeys]);

  async function registerPasskey() {
    setError("");
    setMessage("");

    if (!window.PublicKeyCredential || !window.isSecureContext) {
      setError("Passkey memerlukan browser modern melalui HTTPS.");
      return;
    }
    if (!masterPassword) {
      setError("Masukkan Master Password untuk mengaktifkan passkey.");
      return;
    }
    if (!accountEmail) {
      setError("Data akun belum selesai dimuat. Coba beberapa saat lagi.");
      return;
    }

    setRegistering(true);
    try {
      const authenticationSecret = await deriveAuthenticationSecret(masterPassword, accountEmail);
      const optionsResponse = await fetch("/api/auth/passkeys/register/options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ authenticationSecret }),
      });
      const options = await optionsResponse.json();
      if (!optionsResponse.ok) throw new Error(options.error);

      const registrationResponse = await startRegistration({
        optionsJSON: options,
      });
      const verifyResponse = await fetch("/api/auth/passkeys/register/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          response: registrationResponse,
          name: getDeviceName(),
        }),
      });
      const result = await verifyResponse.json();
      if (!verifyResponse.ok) throw new Error(result.error);

      setMessage("Akses cepat berhasil diaktifkan pada perangkat ini.");
      setMasterPassword("");
      setShowMasterPassword(false);
      await loadPasskeys();
    } catch (caughtError) {
      const text =
        caughtError instanceof Error && caughtError.name !== "NotAllowedError"
          ? caughtError.message
          : "Pendaftaran passkey dibatalkan.";
      setError(text);
    } finally {
      setRegistering(false);
    }
  }

  async function removePasskey(id: string) {
    if (!window.confirm("Hapus akses cepat dari perangkat ini?")) return;

    const response = await fetch("/api/auth/passkeys", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (response.ok) {
      setPasskeys((current) => current.filter((passkey) => passkey.id !== id));
      setMessage("Passkey berhasil dihapus.");
    } else {
      setError("Passkey gagal dihapus.");
    }
  }

  return (
    <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <Fingerprint className="h-5 w-5 text-gray-700" />
        <h2 className="text-sm font-bold uppercase tracking-wider text-gray-900">
          Akses Cepat Perangkat
        </h2>
      </div>

      <p className="text-xs leading-relaxed text-gray-500">
        Aktifkan passkey untuk masuk menggunakan Face ID, sidik jari, Windows Hello, atau PIN
        perangkat. Data biometrik tetap berada di perangkat dan tidak disimpan TitipSandi.
      </p>

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
          {error}
        </p>
      )}
      {message && (
        <p className="rounded-xl border border-green-200 bg-green-50 p-3 text-xs font-semibold text-green-700">
          {message}
        </p>
      )}

      <div className="space-y-1">
        <label
          htmlFor="passkey-master-password"
          className="text-[10px] font-bold uppercase tracking-wider text-gray-500"
        >
          Konfirmasi Master Password
        </label>
        <div className="relative">
          <input
            id="passkey-master-password"
            type={showMasterPassword ? "text" : "password"}
            value={masterPassword}
            onChange={(event) => setMasterPassword(event.target.value)}
            autoComplete="current-password"
            placeholder="Masukkan Master Password"
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-3.5 pr-10 text-xs outline-none transition focus:border-transparent focus:ring-2 focus:ring-gray-900"
          />
          <button
            type="button"
            onClick={() => setShowMasterPassword((current) => !current)}
            aria-label={
              showMasterPassword ? "Sembunyikan Master Password" : "Tampilkan Master Password"
            }
            aria-pressed={showMasterPassword}
            className="absolute inset-y-0 right-0 flex cursor-pointer items-center pr-3 text-gray-400 transition hover:text-gray-700"
          >
            {showMasterPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={registerPasskey}
        disabled={registering || loading || !accountEmail}
        className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-gray-900 py-3 text-xs font-bold text-white transition hover:bg-gray-800 disabled:cursor-wait disabled:opacity-60"
      >
        {registering ? (
          <LoaderCircle className="h-4 w-4 animate-spin" />
        ) : (
          <Fingerprint className="h-4 w-4" />
        )}
        {registering ? "Mengaktifkan..." : "Aktifkan Face ID / Sidik Jari / PIN"}
      </button>

      {!loading && passkeys.length > 0 && (
        <div className="space-y-2 border-t border-gray-100 pt-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
            Passkey terdaftar
          </p>
          {passkeys.map((passkey) => (
            <div
              key={passkey.id}
              className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 p-3"
            >
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 truncate text-xs font-bold text-gray-800">
                  <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-green-600" />
                  {passkey.name}
                </p>
                <p className="mt-0.5 text-[10px] text-gray-400">
                  Ditambahkan {new Date(passkey.createdAt).toLocaleDateString("id-ID")}
                  {passkey.backedUp ? " · tersinkronisasi" : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => removePasskey(passkey.id)}
                aria-label={`Hapus ${passkey.name}`}
                className="shrink-0 cursor-pointer rounded-lg p-2 text-red-500 transition hover:bg-red-50 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
