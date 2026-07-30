"use client";

import { useCallback, useEffect, useState } from "react";
import { Clock3, Laptop, LoaderCircle, ShieldCheck, Trash2 } from "lucide-react";

type UserSession = {
  id: string;
  method: string;
  deviceLabel: string;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
};

export default function SessionManagement() {
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState("");
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadSessions = useCallback(async () => {
    try {
      const response = await fetch("/api/security/sessions");
      if (!response.ok) throw new Error("Daftar sesi belum dapat dimuat.");
      const result = await response.json();
      setSessions(result.sessions || []);
      setCurrentSessionId(result.currentSessionId || "");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : "Daftar sesi belum dapat dimuat.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const load = async () => {
      await loadSessions();
    };
    if (active) {
      void load();
    }
    return () => {
      active = false;
    };
  }, [loadSessions]);

  async function revokeSession(sessionId?: string) {
    const requestKey = sessionId || "all-others";
    setRevoking(requestKey);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/security/sessions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sessionId ? { sessionId } : { allOthers: true }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Sesi gagal dicabut.");

      setMessage(
        sessionId
          ? "Sesi perangkat berhasil dicabut."
          : `${result.revokedCount} sesi perangkat lain berhasil dicabut.`,
      );
      await loadSessions();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Sesi gagal dicabut.");
    } finally {
      setRevoking("");
    }
  }

  const otherSessions = sessions.filter((session) => session.id !== currentSessionId);

  return (
    <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <Laptop className="h-5 w-5 text-gray-700" />
        <h2 className="text-sm font-bold uppercase tracking-wider text-gray-900">
          Perangkat & Sesi
        </h2>
      </div>

      <p className="text-xs leading-relaxed text-gray-500">
        Sesi aktif berlaku maksimal 12 jam. Cabut akses perangkat yang tidak Anda kenali.
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
      {loading && <p className="text-xs text-gray-400">Memuat sesi...</p>}

      {!loading && sessions.length > 0 && (
        <div
          role="list"
          aria-label="Daftar perangkat dan sesi aktif"
          tabIndex={0}
          className="max-h-[28rem] space-y-2 overflow-y-auto overscroll-contain pr-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2"
        >
          {sessions.map((session) => {
            const current = session.id === currentSessionId;
            return (
              <div
                key={session.id}
                role="listitem"
                className="flex items-start justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-xs font-bold text-gray-800">
                      {session.deviceLabel}
                    </p>
                    {current && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[9px] font-bold text-green-700">
                        <ShieldCheck className="h-2.5 w-2.5" />
                        Perangkat ini
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[10px] text-gray-500">
                    {session.method === "passkey"
                      ? "Passkey"
                      : session.method === "password_totp"
                        ? "Password + Authenticator"
                        : "Password + OTP Email"}
                  </p>
                  <p className="mt-1 flex items-center gap-1 text-[10px] text-gray-400">
                    <Clock3 className="h-3 w-3" />
                    Aktif {new Date(session.lastSeenAt).toLocaleString("id-ID")}
                  </p>
                </div>

                {!current && (
                  <button
                    type="button"
                    onClick={() => void revokeSession(session.id)}
                    disabled={Boolean(revoking)}
                    aria-label={`Cabut sesi ${session.deviceLabel}`}
                    className="rounded-lg p-2 text-red-500 transition hover:bg-red-100 disabled:cursor-wait disabled:opacity-50"
                  >
                    {revoking === session.id ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!loading && sessions.length === 0 && (
        <p className="rounded-xl bg-gray-50 p-3 text-xs text-gray-500">
          Tidak ada sesi aktif yang dapat ditampilkan.
        </p>
      )}

      {otherSessions.length > 0 && (
        <button
          type="button"
          onClick={() => void revokeSession()}
          disabled={Boolean(revoking)}
          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 py-2.5 text-xs font-bold text-red-700 transition hover:bg-red-100 disabled:cursor-wait disabled:opacity-50"
        >
          {revoking === "all-others" ? (
            <LoaderCircle className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
          Cabut semua sesi perangkat lain
        </button>
      )}
    </section>
  );
}
