"use client";

import { useState } from "react";
import Link from "next/link";
import { CATEGORIES } from "@/lib/categories";
import { ArrowLeft, ShieldAlert, Eye, EyeOff, Copy, Check, ExternalLink } from "lucide-react";
import {
  decryptClientVaultPayload,
  hashEmergencyAccessCode,
  unlockEmergencyVaultKey,
} from "@/lib/client-vault-crypto";

interface VaultEntry {
  id: string;
  category: string;
  title: string;
  username: string | null;
  email: string | null;
  password: string;
  pin: string | null;
  url: string | null;
  notes: string | null;
}

interface EmergencyData {
  owner: { name: string; email: string };
  contact: { name: string; relation: string };
  entries: VaultEntry[];
}

export default function EmergencyPage() {
  const [accessCode, setAccessCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<EmergencyData | null>(null);
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState("");
  const [pendingUntil, setPendingUntil] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setPendingUntil("");
    setLoading(true);

    try {
      const accessCodeHash = await hashEmergencyAccessCode(accessCode);
      const res = await fetch("/api/emergency", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessCodeHash }),
      });

      const result = await res.json();
      if (!res.ok) {
        setError(result.error);
        return;
      }

      if (result.state === "pending") {
        setPendingUntil(result.availableAt);
        setError(result.message);
        return;
      }
      if (result.state !== "granted") {
        setError("Status akses darurat tidak valid.");
        return;
      }

      const emergencyKey = await unlockEmergencyVaultKey(
        accessCode,
        result.owner.id,
        result.contact.id,
        result.emergencyVaultKey,
      );
      const entries = await Promise.all(
        result.entries.map(
          async (entry: { id: string; encryptedPayload: unknown }): Promise<VaultEntry> => {
            const payload = await decryptClientVaultPayload(
              emergencyKey,
              result.owner.id,
              entry.id,
              entry.encryptedPayload,
            );
            return { id: entry.id, ...payload };
          },
        ),
      );
      setData({
        owner: { name: result.owner.name, email: result.owner.email },
        contact: { name: result.contact.name, relation: result.contact.relation },
        entries,
      });
    } catch {
      setError("Gagal terhubung ke server");
    } finally {
      setLoading(false);
    }
  }

  function togglePassword(id: string) {
    setVisiblePasswords((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function copyToClipboard(text: string, id: string) {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(""), 2000);
  }

  function renderCategoryIcon(value: string) {
    const cat = CATEGORIES.find((c) => c.value === value);
    if (!cat) return null;
    const IconComponent = cat.icon;
    return <IconComponent className="w-5 h-5 text-gray-500" />;
  }

  if (!data) {
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
          <div className="text-center space-y-3">
            <div className="mx-auto w-12 h-12 bg-red-600/10 text-red-600 rounded-xl flex items-center justify-center border border-red-200">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Akses Darurat</h1>
            <p className="text-sm text-gray-500">
              Masukkan kode akses darurat yang diberikan oleh pemilik brankas untuk melihat
              informasi rahasia.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-medium rounded-xl">
                {error}
                {pendingUntil && (
                  <p className="mt-1">
                    Akses otomatis tersedia setelah {new Date(pendingUntil).toLocaleString("id-ID")}
                    .
                  </p>
                )}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Kode Akses
              </label>
              <input
                type="text"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                required
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-600 focus:border-transparent outline-none font-mono text-center text-base tracking-wider font-extrabold transition shadow-sm"
                placeholder="Tempel kode akses darurat"
                maxLength={64}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-red-600 text-white rounded-xl font-semibold text-sm hover:bg-red-700 transition disabled:opacity-50 shadow-md shadow-red-600/10 cursor-pointer"
            >
              {loading ? "Memverifikasi..." : "Buka Brankas"}
            </button>
          </form>
        </div>

        <div />
      </div>
    );
  }

  const grouped = data.entries.reduce<Record<string, VaultEntry[]>>((acc, entry) => {
    if (!acc[entry.category]) acc[entry.category] = [];
    acc[entry.category].push(entry);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-red-600 text-white sticky top-0 z-10 shadow-md">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-85">
              Akses Darurat
            </span>
            <h1 className="text-base font-extrabold tracking-tight">
              TitipSandi · {data.owner.name}
            </h1>
            <p className="text-xs opacity-75 mt-0.5">
              Oleh: {data.contact.name} ({data.contact.relation})
            </p>
          </div>
          <Link
            href="/"
            className="p-1.5 hover:bg-red-700/50 rounded-lg transition text-xs font-semibold border border-white/20"
          >
            Keluar
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-6 space-y-6">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3 items-start">
          <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-amber-800 leading-relaxed font-medium">
            <strong>Peringatan:</strong> Informasi di bawah ini bersifat sangat rahasia. Gunakan
            hanya untuk keperluan darurat yang sah dan mendesak.
          </div>
        </div>

        {Object.entries(grouped).map(([category, entries]) => (
          <div key={category} className="space-y-3">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2 pt-2">
              {renderCategoryIcon(category)}
              <span>{CATEGORIES.find((c) => c.value === category)?.label || category}</span>
              <span>({entries.length})</span>
            </h2>

            <div className="grid grid-cols-1 gap-3">
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  className="bg-white border border-gray-250/70 rounded-2xl p-4 shadow-sm space-y-3"
                >
                  <h3 className="text-sm font-bold text-gray-900">{entry.title}</h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {entry.username && (
                      <div className="flex items-center justify-between sm:justify-start gap-4 p-2 bg-gray-50/60 rounded-xl">
                        <span className="text-gray-450 font-medium">Username</span>
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-gray-900 font-semibold truncate">
                            {entry.username}
                          </span>
                          <button
                            onClick={() => copyToClipboard(entry.username!, `un-${entry.id}`)}
                            className="p-1 text-gray-400 hover:text-gray-600"
                          >
                            {copiedId === `un-${entry.id}` ? (
                              <Check className="w-3.5 h-3.5 text-green-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    )}

                    {entry.email && (
                      <div className="flex items-center justify-between sm:justify-start gap-4 p-2 bg-gray-50/60 rounded-xl">
                        <span className="text-gray-450 font-medium">Email</span>
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-gray-900 font-semibold truncate">
                            {entry.email}
                          </span>
                          <button
                            onClick={() => copyToClipboard(entry.email!, `em-${entry.id}`)}
                            className="p-1 text-gray-400 hover:text-gray-600"
                          >
                            {copiedId === `em-${entry.id}` ? (
                              <Check className="w-3.5 h-3.5 text-green-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between sm:justify-start gap-4 p-2 bg-gray-50/60 rounded-xl">
                      <span className="text-gray-455 font-medium">Password</span>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-900 font-mono font-bold tracking-wider">
                          {visiblePasswords.has(entry.id) ? entry.password : "••••••••"}
                        </span>
                        <div className="flex items-center gap-0.5">
                          <button
                            onClick={() => togglePassword(entry.id)}
                            className="p-1 text-gray-400 hover:text-gray-600"
                          >
                            {visiblePasswords.has(entry.id) ? (
                              <EyeOff className="w-3.5 h-3.5" />
                            ) : (
                              <Eye className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <button
                            onClick={() => copyToClipboard(entry.password, `pw-${entry.id}`)}
                            className="p-1 text-gray-400 hover:text-gray-600"
                          >
                            {copiedId === `pw-${entry.id}` ? (
                              <Check className="w-3.5 h-3.5 text-green-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    {entry.pin && (
                      <div className="flex items-center justify-between sm:justify-start gap-4 p-2 bg-gray-50/60 rounded-xl">
                        <span className="text-gray-450 font-medium">PIN</span>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-900 font-mono font-bold tracking-wider">
                            {visiblePasswords.has(`pin-${entry.id}`) ? entry.pin : "••••"}
                          </span>
                          <div className="flex items-center gap-0.5">
                            <button
                              onClick={() => togglePassword(`pin-${entry.id}`)}
                              className="p-1 text-gray-400 hover:text-gray-600"
                            >
                              {visiblePasswords.has(`pin-${entry.id}`) ? (
                                <EyeOff className="w-3.5 h-3.5" />
                              ) : (
                                <Eye className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <button
                              onClick={() => copyToClipboard(entry.pin!, `pin-${entry.id}`)}
                              className="p-1 text-gray-400 hover:text-gray-600"
                            >
                              {copiedId === `pin-${entry.id}` ? (
                                <Check className="w-3.5 h-3.5 text-green-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {(entry.url || entry.notes) && (
                    <div className="pt-3 border-t border-gray-100 flex flex-col gap-1.5 text-xs">
                      {entry.url && (
                        <a
                          href={entry.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-blue-600 hover:underline font-semibold w-fit"
                        >
                          <span>Kunjungi Situs</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      {entry.notes && (
                        <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100 text-gray-500 leading-relaxed">
                          {entry.notes}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </main>
    </div>
  );
}
