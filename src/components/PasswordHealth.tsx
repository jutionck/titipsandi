"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Clock3,
  HeartPulse,
  KeyRound,
  Repeat2,
} from "lucide-react";

import { useVaultKey } from "@/components/VaultKeyProvider";
import { decryptClientVaultPayload } from "@/lib/client-vault-crypto";
import { analyzeVaultPasswords, type PasswordHealthReport } from "@/lib/password-health";

type EncryptedEntry = {
  id: string;
  encryptedPayload: unknown;
  createdAt: string;
};

export default function PasswordHealth() {
  const { vaultKey, userId } = useVaultKey();
  const [report, setReport] = useState<PasswordHealthReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!vaultKey || !userId) return;
    let active = true;
    const controller = new AbortController();

    void fetch("/api/vault", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || "Kesehatan password belum dapat dianalisis.");
        }
        return result.entries as EncryptedEntry[];
      })
      .then(async (encryptedEntries) => {
        const inputs = await Promise.all(
          encryptedEntries.map(async (entry) => {
            const payload = await decryptClientVaultPayload(
              vaultKey,
              userId,
              entry.id,
              entry.encryptedPayload,
            );
            return {
              id: entry.id,
              title: payload.title,
              password: payload.password,
              passwordUpdatedAt: payload.passwordUpdatedAt,
              createdAt: entry.createdAt,
            };
          }),
        );

        if (active) setReport(analyzeVaultPasswords(inputs));
      })
      .catch((caughtError) => {
        if (!active || (caughtError instanceof Error && caughtError.name === "AbortError")) {
          return;
        }
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Kesehatan password belum dapat dianalisis.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [userId, vaultKey]);

  const actionEntries =
    report?.entries.filter((entry) => entry.status === "risk" || entry.status === "review") || [];

  return (
    <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <HeartPulse className="h-5 w-5 text-gray-700" />
        <h2 className="text-sm font-bold uppercase tracking-wider text-gray-900">
          Kesehatan Password
        </h2>
      </div>

      <p className="text-xs leading-relaxed text-gray-500">
        Analisis dilakukan di browser. Password dan hasil analisis tidak dikirim ke server.
      </p>

      {loading && <p className="text-xs text-gray-400">Menganalisis vault...</p>}
      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
          {error}
        </p>
      )}

      {!loading && !error && report && (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-xl bg-gray-50 p-3">
              <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Total</p>
              <p className="mt-1 text-lg font-extrabold text-gray-900">{report.total}</p>
            </div>
            <div className="rounded-xl bg-red-50 p-3">
              <p className="text-[9px] font-bold uppercase tracking-wider text-red-500">Berisiko</p>
              <p className="mt-1 text-lg font-extrabold text-red-700">{report.risk}</p>
            </div>
            <div className="rounded-xl bg-amber-50 p-3">
              <p className="text-[9px] font-bold uppercase tracking-wider text-amber-600">
                Perlu ditinjau
              </p>
              <p className="mt-1 text-lg font-extrabold text-amber-700">{report.review}</p>
            </div>
            <div className="rounded-xl bg-green-50 p-3">
              <p className="text-[9px] font-bold uppercase tracking-wider text-green-600">Baik</p>
              <p className="mt-1 text-lg font-extrabold text-green-700">{report.good}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 text-[10px] font-semibold text-gray-600">
            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1">
              <KeyRound className="h-3 w-3" />
              {report.weak} lemah
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1">
              <Repeat2 className="h-3 w-3" />
              {report.reused} digunakan ulang
            </span>
          </div>

          {actionEntries.length === 0 ? (
            <div className="flex items-start gap-2 rounded-xl bg-green-50 p-3 text-green-700">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <p className="text-xs font-semibold leading-relaxed">
                Tidak terdeteksi password lemah, digunakan ulang, atau perlu ditinjau saat ini.
              </p>
            </div>
          ) : (
            <div
              role="list"
              aria-label="Password yang perlu diperhatikan"
              tabIndex={0}
              className="max-h-96 divide-y divide-gray-100 overflow-y-auto overscroll-contain pr-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2"
            >
              {actionEntries.map((entry) => {
                const risky = entry.status === "risk";
                const StatusIcon = risky ? AlertTriangle : Clock3;

                return (
                  <Link
                    key={entry.id}
                    role="listitem"
                    href={`/vault/${entry.id}/edit`}
                    className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                        risky ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"
                      }`}
                    >
                      <StatusIcon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-bold text-gray-800">
                        {entry.title}
                      </span>
                      <span className="mt-0.5 block text-[10px] leading-relaxed text-gray-500">
                        {entry.reasons.join(" · ")}
                      </span>
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" />
                  </Link>
                );
              })}
            </div>
          )}

          <p className="text-[10px] leading-relaxed text-gray-400">
            Review 180 hari adalah pengingat opsional, bukan kewajiban mengganti password.
            Prioritaskan password lemah, digunakan ulang, atau terindikasi bocor. Skor bersifat
            heuristik dan bukan jaminan keamanan.
          </p>
        </>
      )}
    </section>
  );
}
