"use client";

import { useEffect, useState } from "react";
import { Clock3, History, ShieldAlert, ShieldCheck } from "lucide-react";

type SecurityEvent = {
  id: string;
  action: string;
  outcome: string;
  actorType: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

const EVENT_LABELS: Record<string, string> = {
  LOGIN: "Login akun",
  SESSION_REVOKED: "Sesi perangkat dicabut",
  TOTP_ENABLED: "Authenticator diaktifkan",
  TOTP_DISABLED: "Authenticator dinonaktifkan",
  RECOVERY_CODES_REGENERATED: "Recovery code diperbarui",
  RECOVERY_CODE_USED: "Recovery code digunakan",
  PASSWORD_CHANGED: "Password diubah",
  TRUSTED_CONTACT_CREATED: "Kontak darurat ditambahkan",
  TRUSTED_CONTACT_DELETED: "Kontak darurat dihapus",
  EMERGENCY_ACCESS_REQUESTED: "Akses darurat diminta",
  EMERGENCY_ACCESS_APPROVED: "Akses darurat disetujui",
  EMERGENCY_ACCESS_REJECTED: "Akses darurat ditolak",
  EMERGENCY_ACCESS_GRANTED: "Vault dibuka melalui akses darurat",
};

function eventDescription(event: SecurityEvent) {
  const method = typeof event.metadata?.method === "string" ? event.metadata.method : null;
  if (event.action === "LOGIN" && method === "passkey") return "Menggunakan passkey";
  if (event.action === "LOGIN" && method === "password_otp") return "Menggunakan password dan OTP";
  if (event.action === "LOGIN" && method === "password_totp")
    return "Menggunakan password dan authenticator";
  if (event.action.startsWith("EMERGENCY_")) return "Oleh kontak tepercaya";
  return event.actorType === "OWNER" ? "Oleh pemilik akun" : "Aktivitas sistem";
}

export default function SecurityActivity() {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    void fetch("/api/security/events")
      .then(async (response) => {
        if (!response.ok) throw new Error("Riwayat keamanan belum dapat dimuat.");
        return response.json();
      })
      .then((result) => {
        if (active) setEvents(result.events || []);
      })
      .catch((caughtError) => {
        if (active) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Riwayat keamanan belum dapat dimuat.",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <History className="h-5 w-5 text-gray-700" />
        <h2 className="text-sm font-bold uppercase tracking-wider text-gray-900">
          Aktivitas Keamanan
        </h2>
      </div>

      <p className="text-xs leading-relaxed text-gray-500">
        50 aktivitas terbaru yang berkaitan dengan login, password, kontak, dan akses darurat.
      </p>

      {loading && <p className="text-xs text-gray-400">Memuat aktivitas...</p>}
      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
          {error}
        </p>
      )}
      {!loading && !error && events.length === 0 && (
        <p className="rounded-xl bg-gray-50 p-3 text-xs text-gray-500">
          Belum ada aktivitas keamanan yang tercatat.
        </p>
      )}

      {events.length > 0 && (
        <div
          role="list"
          aria-label="Daftar aktivitas keamanan"
          tabIndex={0}
          className="max-h-[28rem] divide-y divide-gray-100 overflow-y-auto overscroll-contain pr-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2"
        >
          {events.map((event) => {
            const succeeded = event.outcome === "SUCCESS";
            const StatusIcon = succeeded ? ShieldCheck : ShieldAlert;

            return (
              <div key={event.id} role="listitem" className="flex gap-3 py-3 first:pt-0 last:pb-0">
                <div
                  className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                    succeeded ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
                  }`}
                >
                  <StatusIcon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-gray-800">
                    {EVENT_LABELS[event.action] || "Aktivitas keamanan"}
                  </p>
                  <p className="mt-0.5 text-[11px] text-gray-500">{eventDescription(event)}</p>
                  <p className="mt-1 flex items-center gap-1 text-[10px] text-gray-400">
                    <Clock3 className="h-3 w-3" />
                    {new Date(event.createdAt).toLocaleString("id-ID")}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
