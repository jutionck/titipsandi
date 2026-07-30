"use client";

import { useEffect, useState, useCallback, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { CATEGORIES } from "@/lib/categories";
import BottomNav from "@/components/BottomNav";
import DashboardDesktopNav from "@/components/DashboardDesktopNav";
import { useVaultKey } from "@/components/VaultKeyProvider";
import { decryptClientVaultPayload } from "@/lib/client-vault-crypto";
import {
  Shield,
  Search,
  Edit3,
  Trash2,
  Eye,
  EyeOff,
  Copy,
  Check,
  LockKeyhole,
  ExternalLink,
  X,
} from "lucide-react";

interface VaultEntry {
  id: string;
  category: string;
  title: string;
  username: string | null;
  email: string | null;
  hasPin: boolean;
  hasUrl: boolean;
  hasNotes: boolean;
  updatedAt: string;
}

interface VaultSecret {
  password: string;
  pin: string | null;
  url: string | null;
  notes: string | null;
}

function DashboardPageContent() {
  const router = useRouter();
  const { vaultKey, userId } = useVaultKey();
  const searchParams = useSearchParams();
  const showCategoriesSheet = searchParams.get("categories") === "true";

  const [entries, setEntries] = useState<VaultEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("");
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());
  const [secretEntries, setSecretEntries] = useState<Record<string, VaultSecret>>({});
  const [loadingSecrets, setLoadingSecrets] = useState<Set<string>>(new Set());
  const [secretErrors, setSecretErrors] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string>("");
  const [deleteTarget, setDeleteTarget] = useState<VaultEntry | null>(null);
  const [deletingId, setDeletingId] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const deleteCancelRef = useRef<HTMLButtonElement>(null);

  const fetchEntries = useCallback(async () => {
    try {
      if (!vaultKey || !userId) return;
      const res = await fetch("/api/vault", { cache: "no-store" });
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memuat vault.");

      const decrypted = await Promise.all(
        (data.entries || []).map(
          async (entry: {
            id: string;
            encryptedPayload: unknown;
            updatedAt: string;
          }): Promise<{ entry: VaultEntry; secret: VaultSecret }> => {
            const payload = await decryptClientVaultPayload(
              vaultKey,
              userId,
              entry.id,
              entry.encryptedPayload,
            );
            return {
              entry: {
                id: entry.id,
                category: payload.category,
                title: payload.title,
                username: payload.username,
                email: payload.email,
                hasPin: Boolean(payload.pin),
                hasUrl: Boolean(payload.url),
                hasNotes: Boolean(payload.notes),
                updatedAt: entry.updatedAt,
              },
              secret: {
                password: payload.password,
                pin: payload.pin,
                url: payload.url,
                notes: payload.notes,
              },
            };
          },
        ),
      );
      const normalizedSearch = search.trim().toLowerCase();
      const filtered = decrypted.filter(
        ({ entry }) =>
          (!activeCategory || entry.category === activeCategory) &&
          (!normalizedSearch ||
            entry.title.toLowerCase().includes(normalizedSearch) ||
            entry.username?.toLowerCase().includes(normalizedSearch) ||
            entry.email?.toLowerCase().includes(normalizedSearch)),
      );

      setEntries(filtered.map(({ entry }) => entry));
      setSecretEntries(
        Object.fromEntries(decrypted.map(({ entry, secret }) => [entry.id, secret])),
      );
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [activeCategory, router, search, userId, vaultKey]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      await fetchEntries();
    };
    if (active) {
      load();
    }
    return () => {
      active = false;
    };
  }, [fetchEntries]);

  useEffect(() => {
    if (!deleteTarget) return;
    deleteCancelRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !deletingId) {
        setDeleteTarget(null);
        setDeleteError("");
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [deleteTarget, deletingId]);

  function requestDelete(entry: VaultEntry) {
    setDeleteError("");
    setDeleteTarget(entry);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleteError("");
    setDeletingId(deleteTarget.id);
    try {
      const response = await fetch(`/api/vault/${deleteTarget.id}`, { method: "DELETE" });
      if (response.status === 401) {
        router.push("/login");
        return;
      }
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Entry belum dapat dihapus.");
      }
      setEntries((current) => current.filter((entry) => entry.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (caughtError) {
      setDeleteError(
        caughtError instanceof Error ? caughtError.message : "Entry belum dapat dihapus.",
      );
    } finally {
      setDeletingId("");
    }
  }

  async function loadSecret(id: string) {
    if (secretEntries[id]) return secretEntries[id];

    setLoadingSecrets((current) => new Set(current).add(id));
    setSecretErrors((current) => {
      const next = new Set(current);
      next.delete(id);
      return next;
    });

    try {
      const response = await fetch(`/api/vault/${id}`);
      if (response.status === 401) {
        router.push("/login");
        return null;
      }
      if (!response.ok) throw new Error("Gagal memuat detail rahasia");

      const data = await response.json();
      if (!vaultKey || !userId) throw new Error("Vault sedang terkunci.");
      const payload = await decryptClientVaultPayload(
        vaultKey,
        userId,
        id,
        data.entry.encryptedPayload,
      );
      const secret: VaultSecret = {
        password: payload.password,
        pin: payload.pin,
        url: payload.url,
        notes: payload.notes,
      };
      setSecretEntries((current) => ({ ...current, [id]: secret }));
      return secret;
    } catch {
      setSecretErrors((current) => new Set(current).add(id));
      return null;
    } finally {
      setLoadingSecrets((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
    }
  }

  async function togglePassword(id: string, entryId: string) {
    if (!visiblePasswords.has(id) && !(await loadSecret(entryId))) return;

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

  async function copySecret(entryId: string, field: "password" | "pin", copiedKey: string) {
    const secret = await loadSecret(entryId);
    const value = secret?.[field];
    if (!value) return;
    await copyToClipboard(value, copiedKey);
  }

  const categoryCounts = entries.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + 1;
    return acc;
  }, {});

  function renderCategoryIcon(value: string) {
    const cat = CATEGORIES.find((c) => c.value === value);
    if (!cat) return null;
    const IconComponent = cat.icon;
    return <IconComponent className="w-5 h-5 text-gray-500" />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-24 lg:pb-6">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gray-900 text-white rounded-lg flex items-center justify-center">
              <Shield className="w-4.5 h-4.5" />
            </div>
            <span className="font-extrabold text-gray-900 tracking-tight">TitipSandi</span>
          </div>

          <DashboardDesktopNav active="vault" />

          <span className="lg:hidden text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-100 py-1 px-2.5 rounded-full">
            Kunci Aktif
          </span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 space-y-4 px-4 py-5 sm:space-y-6 sm:py-6">
        <div>
          <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">Brankas Anda</h2>
          <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mt-0.5">
            {entries.length} Akun Tersimpan
          </p>
        </div>

        {/* Search */}
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400 pointer-events-none">
            <Search className="w-4.5 h-4.5" />
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari akun, email, atau PIN..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none text-sm transition shadow-sm"
          />
        </div>

        {/* Mobile View: Active Category Indicator (Clean PWA style) */}
        {activeCategory && (
          <div className="lg:hidden flex items-center justify-between bg-white border border-gray-200 rounded-xl px-4 py-2.5 shadow-xs">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-500">Filter aktif:</span>
              <span className="text-xs font-bold text-gray-900 bg-gray-100 py-1 px-2.5 rounded-lg">
                {CATEGORIES.find((c) => c.value === activeCategory)?.label || activeCategory}
              </span>
            </div>
            <button
              onClick={() => setActiveCategory("")}
              className="text-xs font-bold text-red-600 hover:underline flex items-center gap-0.5"
            >
              <X className="w-3.5 h-3.5" /> Hapus
            </button>
          </div>
        )}

        {/* Desktop View: Horizontal Scroll List (Hidden on Mobile) */}
        <div className="hidden flex-wrap gap-2 lg:flex">
          <button
            onClick={() => setActiveCategory("")}
            className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition cursor-pointer snap-start ${
              !activeCategory
                ? "bg-gray-900 text-white shadow-sm"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            Semua ({entries.length})
          </button>
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.value}
                onClick={() => setActiveCategory(cat.value === activeCategory ? "" : cat.value)}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition cursor-pointer snap-start ${
                  activeCategory === cat.value
                    ? "bg-gray-900 text-white shadow-sm"
                    : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{cat.label}</span>
                {categoryCounts[cat.value] ? (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full ${activeCategory === cat.value ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"}`}
                  >
                    {categoryCounts[cat.value]}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        {/* Entry List */}
        {loading ? (
          <div className="text-center py-12 text-sm text-gray-400 font-medium">Memuat data...</div>
        ) : entries.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center space-y-3 shadow-sm">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto text-gray-400">
              <LockKeyhole className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-gray-900">Belum ada password</p>
              <p className="text-xs text-gray-500">
                Mulai dengan menambahkan password atau PIN pertama Anda.
              </p>
            </div>
            <Link
              href="/vault/new"
              className="inline-flex items-center gap-1 text-xs font-bold text-gray-900 hover:underline pt-2"
            >
              Tambah Baru →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="min-w-0 overflow-hidden space-y-3 rounded-2xl border border-gray-200 bg-white p-3 shadow-sm transition hover:border-gray-300 sm:p-3.5"
              >
                <div className="flex items-start justify-between">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gray-100 bg-gray-50 sm:h-9 sm:w-9 sm:rounded-xl">
                      {renderCategoryIcon(entry.category)}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-gray-900 truncate">{entry.title}</h3>
                      <p className="text-[9px] font-semibold uppercase tracking-wider text-gray-400 sm:text-[10px]">
                        {CATEGORIES.find((c) => c.value === entry.category)?.label ||
                          entry.category}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Link
                      href={`/vault/${entry.id}/edit`}
                      className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-50 hover:text-gray-700"
                      title="Edit"
                    >
                      <Edit3 className="w-4 h-4" />
                    </Link>
                    <button
                      onClick={() => requestDelete(entry)}
                      className="rounded-lg p-1.5 text-gray-400 transition hover:bg-red-50 hover:text-red-600"
                      title="Hapus"
                      aria-label={`Hapus ${entry.title}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 border-t border-gray-100 pt-2 text-xs">
                  {entry.username && (
                    <div className="min-w-0 rounded-xl bg-gray-50/80 px-2 py-1.5 sm:px-2.5 sm:py-2">
                      <span className="block text-[9px] font-bold uppercase tracking-wider text-gray-400">
                        Username
                      </span>
                      <div className="mt-0.5 flex min-w-0 items-center gap-1">
                        <span className="min-w-0 flex-1 truncate font-semibold text-gray-900">
                          {entry.username}
                        </span>
                        <button
                          onClick={() => copyToClipboard(entry.username!, `un-${entry.id}`)}
                          className="shrink-0 p-1 text-gray-400 hover:text-gray-600"
                          aria-label={`Salin username ${entry.title}`}
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
                    <div className="min-w-0 rounded-xl bg-gray-50/80 px-2 py-1.5 sm:px-2.5 sm:py-2">
                      <span className="block text-[9px] font-bold uppercase tracking-wider text-gray-400">
                        Email
                      </span>
                      <div className="mt-0.5 flex min-w-0 items-center gap-1">
                        <span className="min-w-0 flex-1 truncate font-semibold text-gray-900">
                          {entry.email}
                        </span>
                        <button
                          onClick={() => copyToClipboard(entry.email!, `em-${entry.id}`)}
                          className="shrink-0 p-1 text-gray-400 hover:text-gray-600"
                          aria-label={`Salin email ${entry.title}`}
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

                  <div className="min-w-0 rounded-xl bg-gray-50/80 px-2 py-1.5 sm:px-2.5 sm:py-2">
                    <span className="block text-[9px] font-bold uppercase tracking-wider text-gray-400">
                      Password
                    </span>
                    <div className="mt-0.5 flex min-w-0 items-center gap-1">
                      <span className="min-w-0 flex-1 truncate font-mono font-bold tracking-wider text-gray-900">
                        {visiblePasswords.has(entry.id)
                          ? secretEntries[entry.id]?.password
                          : "••••••••"}
                      </span>
                      <div className="flex shrink-0 items-center">
                        <button
                          onClick={() => togglePassword(entry.id, entry.id)}
                          disabled={loadingSecrets.has(entry.id)}
                          className="p-1 text-gray-400 hover:text-gray-600"
                          aria-label={`${visiblePasswords.has(entry.id) ? "Sembunyikan" : "Tampilkan"} password ${entry.title}`}
                        >
                          {visiblePasswords.has(entry.id) ? (
                            <EyeOff className="w-3.5 h-3.5" />
                          ) : (
                            <Eye className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          onClick={() => copySecret(entry.id, "password", `pw-${entry.id}`)}
                          disabled={loadingSecrets.has(entry.id)}
                          className="p-1 text-gray-400 hover:text-gray-600"
                          aria-label={`Salin password ${entry.title}`}
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

                  {entry.hasPin && secretEntries[entry.id]?.pin && (
                    <div className="min-w-0 rounded-xl bg-gray-50/80 px-2 py-1.5 sm:px-2.5 sm:py-2">
                      <span className="block text-[9px] font-bold uppercase tracking-wider text-gray-400">
                        PIN
                      </span>
                      <div className="mt-0.5 flex min-w-0 items-center gap-1">
                        <span className="min-w-0 flex-1 truncate font-mono font-bold tracking-wider text-gray-900">
                          {visiblePasswords.has(`pin-${entry.id}`)
                            ? secretEntries[entry.id]?.pin
                            : "••••"}
                        </span>
                        <div className="flex shrink-0 items-center">
                          <button
                            onClick={() => togglePassword(`pin-${entry.id}`, entry.id)}
                            className="p-1 text-gray-400 hover:text-gray-600"
                            aria-label={`${visiblePasswords.has(`pin-${entry.id}`) ? "Sembunyikan" : "Tampilkan"} PIN ${entry.title}`}
                          >
                            {visiblePasswords.has(`pin-${entry.id}`) ? (
                              <EyeOff className="w-3.5 h-3.5" />
                            ) : (
                              <Eye className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <button
                            onClick={() => copySecret(entry.id, "pin", `pin-${entry.id}`)}
                            className="p-1 text-gray-400 hover:text-gray-600"
                            aria-label={`Salin PIN ${entry.title}`}
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

                {secretErrors.has(entry.id) && (
                  <p className="text-xs text-red-600">Detail rahasia gagal dimuat. Coba lagi.</p>
                )}

                {(entry.hasPin || entry.hasUrl || entry.hasNotes) && !secretEntries[entry.id] && (
                  <div className="pt-3 border-t border-gray-100">
                    <button
                      onClick={() => loadSecret(entry.id)}
                      disabled={loadingSecrets.has(entry.id)}
                      className="text-xs font-semibold text-gray-600 hover:text-gray-900 disabled:text-gray-400"
                    >
                      {loadingSecrets.has(entry.id) ? "Memuat detail..." : "Lihat detail rahasia"}
                    </button>
                  </div>
                )}

                {(secretEntries[entry.id]?.url || secretEntries[entry.id]?.notes) && (
                  <div className="pt-3 border-t border-gray-100 flex flex-col gap-1.5 text-xs">
                    {secretEntries[entry.id]?.url && (
                      <a
                        href={secretEntries[entry.id].url!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-blue-600 hover:underline font-semibold w-fit"
                      >
                        <span>Kunjungi Situs</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    {secretEntries[entry.id]?.notes && (
                      <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100 text-gray-500 leading-relaxed">
                        {secretEntries[entry.id].notes}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/55 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !deletingId) {
              setDeleteTarget(null);
              setDeleteError("");
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-vault-title"
            aria-describedby="delete-vault-description"
            className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
                <Trash2 className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h2 id="delete-vault-title" className="text-base font-bold text-gray-900">
                  Hapus entry vault?
                </h2>
                <p
                  id="delete-vault-description"
                  className="mt-1 text-xs leading-relaxed text-gray-600"
                >
                  <strong className="font-bold text-gray-900">{deleteTarget.title}</strong> akan
                  dihapus permanen beserta password dan informasi terkait. Tindakan ini tidak dapat
                  dibatalkan.
                </p>
              </div>
            </div>

            {deleteError && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700">
                {deleteError}
              </div>
            )}

            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                ref={deleteCancelRef}
                type="button"
                onClick={() => {
                  setDeleteTarget(null);
                  setDeleteError("");
                }}
                disabled={Boolean(deletingId)}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={Boolean(deletingId)}
                className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
              >
                {deletingId ? "Menghapus..." : "Ya, hapus"}
              </button>
            </div>
          </div>
        </div>
      )}
      <BottomNav />

      {/* Mobile Bottom Sheet for Categories */}
      {showCategoriesSheet && (
        <div className="lg:hidden fixed inset-0 z-50 flex items-end justify-center">
          {/* Backdrop */}
          <div
            onClick={() => router.push("/dashboard")}
            className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
          />

          {/* Bottom Sheet Container */}
          <div className="relative w-full bg-white rounded-t-3xl shadow-xl z-10 max-h-[85vh] flex flex-col pb-safe animate-in slide-in-from-bottom duration-250">
            {/* Header Drag Handle Indicator */}
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto my-3" />

            <div className="flex items-center justify-between px-6 pb-3 border-b border-gray-100">
              <span className="text-sm font-bold text-gray-900">Pilih Kategori</span>
              <button
                onClick={() => router.push("/dashboard")}
                className="p-1 hover:bg-gray-100 rounded-full text-gray-500 hover:text-gray-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Categories Grid */}
            <div className="overflow-y-auto px-6 py-4 flex-1 pb-10">
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => {
                    setActiveCategory("");
                    router.push("/dashboard");
                  }}
                  className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition cursor-pointer ${
                    !activeCategory
                      ? "bg-gray-900 border-gray-900 text-white"
                      : "bg-gray-50 border-gray-100 text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center mb-1.5 ${!activeCategory ? "bg-white/20" : "bg-white shadow-xs"}`}
                  >
                    <Shield className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold text-center truncate w-full">Semua</span>
                </button>
                {CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  const isSelected = activeCategory === cat.value;
                  return (
                    <button
                      key={cat.value}
                      onClick={() => {
                        setActiveCategory(isSelected ? "" : cat.value);
                        router.push("/dashboard");
                      }}
                      className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition cursor-pointer ${
                        isSelected
                          ? "bg-gray-900 border-gray-900 text-white"
                          : "bg-gray-50 border-gray-100 text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      <div
                        className={`w-10 h-10 rounded-xl relative flex items-center justify-center mb-1.5 ${isSelected ? "bg-white/20" : "bg-white shadow-xs"}`}
                      >
                        <Icon className="w-5 h-5" />
                        {categoryCounts[cat.value] ? (
                          <span
                            className={`absolute -top-1.5 -right-1.5 text-[9px] font-extrabold px-1.5 py-0.5 rounded-full ${isSelected ? "bg-white text-gray-900" : "bg-gray-900 text-white"}`}
                          >
                            {categoryCounts[cat.value]}
                          </span>
                        ) : null}
                      </div>
                      <span className="text-[10px] font-bold text-center truncate w-full">
                        {cat.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-sm font-semibold text-gray-400">
          Memuat...
        </div>
      }
    >
      <DashboardPageContent />
    </Suspense>
  );
}
