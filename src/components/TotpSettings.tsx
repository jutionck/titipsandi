"use client";

import { useCallback, useEffect, useState } from "react";
import QRCode from "qrcode";
import {
  Check,
  Copy,
  Download,
  KeyRound,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  ShieldOff,
} from "lucide-react";

type TotpStatus = {
  enabled: boolean;
  enabledAt: string | null;
  remainingRecoveryCodes: number;
};

export default function TotpSettings() {
  const [status, setStatus] = useState<TotpStatus | null>(null);
  const [secret, setSecret] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [code, setCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);

  const loadStatus = useCallback(async () => {
    try {
      const response = await fetch("/api/security/totp");
      if (!response.ok) throw new Error("Status authenticator belum dapat dimuat.");
      setStatus(await response.json());
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Status authenticator belum dapat dimuat.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (active) await loadStatus();
    };
    void load();
    return () => {
      active = false;
    };
  }, [loadStatus]);

  async function startSetup() {
    setAction("setup");
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/security/totp/setup", { method: "POST" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setSecret(result.secret);
      setQrCode(
        await QRCode.toDataURL(result.provisioningUri, {
          width: 240,
          margin: 1,
          color: { dark: "#111827", light: "#ffffff" },
        }),
      );
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Setup gagal dimulai.");
    } finally {
      setAction("");
    }
  }

  async function confirmSetup() {
    if (!/^\d{6}$/u.test(code)) return;
    setAction("confirm");
    setError("");
    try {
      const response = await fetch("/api/security/totp/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setRecoveryCodes(result.recoveryCodes || []);
      setSecret("");
      setQrCode("");
      setCode("");
      setMessage(result.message);
      await loadStatus();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Kode tidak valid.");
    } finally {
      setAction("");
    }
  }

  async function regenerateRecoveryCodes() {
    if (!/^\d{6}$/u.test(code)) return;
    setAction("regenerate");
    setError("");
    try {
      const response = await fetch("/api/security/totp/recovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setRecoveryCodes(result.recoveryCodes || []);
      setCode("");
      setMessage("Recovery code lama telah dibatalkan.");
      await loadStatus();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Kode tidak valid.");
    } finally {
      setAction("");
    }
  }

  async function disableTotp() {
    if (!/^\d{6}$/u.test(code)) return;
    setAction("disable");
    setError("");
    try {
      const response = await fetch("/api/security/totp", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setCode("");
      setRecoveryCodes([]);
      setMessage("Authenticator dinonaktifkan.");
      await loadStatus();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Kode tidak valid.");
    } finally {
      setAction("");
    }
  }

  async function copyRecoveryCodes() {
    await navigator.clipboard.writeText(recoveryCodes.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function downloadRecoveryCodes() {
    const blob = new Blob(
      [
        [
          "TitipSandi — Recovery Codes",
          "Setiap kode hanya dapat digunakan satu kali.",
          "",
          ...recoveryCodes,
          "",
        ].join("\n"),
      ],
      { type: "text/plain;charset=utf-8" },
    );
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "titipsandi-recovery-codes.txt";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-gray-700" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-900">
            Authenticator
          </h2>
        </div>
        {status?.enabled && (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-[9px] font-bold text-green-700">
            <ShieldCheck className="h-3 w-3" />
            Aktif
          </span>
        )}
      </div>

      <p className="text-xs leading-relaxed text-gray-500">
        Gunakan kode TOTP dari aplikasi authenticator sebagai verifikasi login setelah Master
        Password.
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
      {loading && <p className="text-xs text-gray-400">Memuat status...</p>}

      {!loading && !status?.enabled && !secret && (
        <button
          type="button"
          onClick={() => void startSetup()}
          disabled={Boolean(action)}
          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-gray-900 py-3 text-xs font-bold text-white transition hover:bg-gray-800 disabled:cursor-wait disabled:opacity-60"
        >
          {action === "setup" ? (
            <LoaderCircle className="h-4 w-4 animate-spin" />
          ) : (
            <KeyRound className="h-4 w-4" />
          )}
          Aktifkan authenticator
        </button>
      )}

      {secret && (
        <div className="space-y-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
          <div className="text-center">
            {qrCode && (
              // QR content is generated locally from the provisioning URI.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qrCode}
                alt="QR setup authenticator"
                className="mx-auto h-48 w-48 rounded-xl border border-gray-200 bg-white p-2"
              />
            )}
            <p className="mt-3 text-[10px] leading-relaxed text-gray-500">
              Pindai QR menggunakan Google Authenticator, Microsoft Authenticator, 1Password, atau
              aplikasi TOTP lain.
            </p>
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
              Kunci manual
            </p>
            <code className="mt-1 block break-all rounded-lg bg-white p-2 text-center text-xs font-bold text-gray-800">
              {secret}
            </code>
          </div>

          <div className="flex gap-2">
            <input
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/gu, "").slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000000"
              aria-label="Kode authenticator"
              className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-center font-mono text-sm font-bold tracking-[0.25em] outline-none focus:ring-2 focus:ring-gray-900"
            />
            <button
              type="button"
              onClick={() => void confirmSetup()}
              disabled={code.length !== 6 || Boolean(action)}
              className="rounded-xl bg-gray-900 px-4 text-xs font-bold text-white disabled:opacity-50"
            >
              {action === "confirm" ? "Memeriksa..." : "Konfirmasi"}
            </button>
          </div>
        </div>
      )}

      {status?.enabled && recoveryCodes.length === 0 && (
        <div className="space-y-3">
          <div className="rounded-xl bg-gray-50 p-3 text-xs text-gray-600">
            Recovery code tersisa:{" "}
            <strong className="text-gray-900">{status.remainingRecoveryCodes}</strong>
          </div>
          <input
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/gu, "").slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="Kode authenticator 6 digit"
            aria-label="Kode authenticator untuk pengaturan"
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-center font-mono text-xs font-bold tracking-[0.2em] outline-none focus:ring-2 focus:ring-gray-900"
          />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => void regenerateRecoveryCodes()}
              disabled={code.length !== 6 || Boolean(action)}
              className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Buat recovery code baru
            </button>
            <button
              type="button"
              onClick={() => void disableTotp()}
              disabled={code.length !== 6 || Boolean(action)}
              className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 py-2.5 text-xs font-bold text-red-700 hover:bg-red-100 disabled:opacity-50"
            >
              <ShieldOff className="h-3.5 w-3.5" />
              Nonaktifkan
            </button>
          </div>
        </div>
      )}

      {recoveryCodes.length > 0 && (
        <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div>
            <p className="text-xs font-bold text-amber-900">Simpan recovery code sekarang</p>
            <p className="mt-1 text-[10px] leading-relaxed text-amber-800">
              Kode ini hanya ditampilkan sekali. Setiap kode dapat menggantikan TOTP satu kali.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-white p-3 font-mono text-[11px] font-bold text-gray-800">
            {recoveryCodes.map((recoveryCode) => (
              <span key={recoveryCode}>{recoveryCode}</span>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void copyRecoveryCodes()}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-gray-900 py-2 text-[10px] font-bold text-white"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Tersalin" : "Salin"}
            </button>
            <button
              type="button"
              onClick={downloadRecoveryCodes}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-amber-300 bg-white py-2 text-[10px] font-bold text-amber-900"
            >
              <Download className="h-3.5 w-3.5" />
              Unduh
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
