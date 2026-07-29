"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { CATEGORIES } from "@/lib/categories";
import BottomNav from "@/components/BottomNav";
import LogoutButton from "@/components/LogoutButton";
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
  Users,
  Plus,
  X,
  Info,
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

  const fetchEntries = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (activeCategory) params.set("category", activeCategory);
      if (search) params.set("search", search);
      const res = await fetch(`/api/vault?${params}`);
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      const data = await res.json();
      setEntries(data.entries || []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [activeCategory, search, router]);

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

  async function handleDelete(id: string) {
    if (!confirm("Yakin ingin menghapus entry ini?")) return;
    await fetch(`/api/vault/${id}`, { method: "DELETE" });
    fetchEntries();
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
      const secret: VaultSecret = {
        password: data.entry.password,
        pin: data.entry.pin,
        url: data.entry.url,
        notes: data.entry.notes,
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
    <div className="min-h-screen bg-gray-50 flex flex-col pb-24 sm:pb-6">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gray-900 text-white rounded-lg flex items-center justify-center">
              <Shield className="w-4.5 h-4.5" />
            </div>
            <span className="font-extrabold text-gray-900 tracking-tight">TitipSandi</span>
          </div>

          {/* Desktop Nav */}
          <div className="hidden sm:flex items-center gap-4">
            <Link
              href="/dashboard"
              className="text-xs font-bold text-gray-900 hover:text-gray-650 flex items-center gap-1"
            >
              <Shield className="w-3.5 h-3.5" />
              Vault
            </Link>
            <Link
              href="/trusted"
              className="text-xs font-bold text-gray-500 hover:text-gray-900 flex items-center gap-1"
            >
              <Users className="w-3.5 h-3.5" />
              Kontak Darurat
            </Link>
            <Link
              href="/vault/new"
              className="text-xs font-bold text-gray-500 hover:text-gray-900 flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              Tambah
            </Link>
            <Link
              href="/info"
              className="text-xs font-bold text-gray-500 hover:text-gray-900 flex items-center gap-1"
            >
              <Info className="w-3.5 h-3.5" />
              Informasi
            </Link>
            <LogoutButton className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-1 cursor-pointer" />
          </div>

          <span className="sm:hidden text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-100 py-1 px-2.5 rounded-full">
            Kunci Aktif
          </span>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6 space-y-6">
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
          <div className="sm:hidden flex items-center justify-between bg-white border border-gray-200 rounded-xl px-4 py-2.5 shadow-xs">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-500">Filter aktif:</span>
              <span className="text-xs font-bold text-gray-900 bg-gray-100 py-1 px-2.5 rounded-lg">
                {CATEGORIES.find((c) => c.value === activeCategory)?.label || activeCategory}
              </span>
            </div>
            <button
              onClick={() => setActiveCategory("")}
              className="text-xs font-bold text-red-650 hover:underline flex items-center gap-0.5"
            >
              <X className="w-3.5 h-3.5" /> Hapus
            </button>
          </div>
        )}

        {/* Desktop View: Horizontal Scroll List (Hidden on Mobile) */}
        <div className="hidden sm:flex gap-2 overflow-x-auto pb-2 scrollbar-none snap-x -mx-4 px-4 sm:mx-0 sm:px-0">
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
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto text-gray-450">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="bg-white border border-gray-250/70 rounded-2xl p-4 shadow-sm hover:border-gray-300 transition space-y-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center border border-gray-100">
                      {renderCategoryIcon(entry.category)}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-gray-900 truncate">{entry.title}</h3>
                      <p className="text-[10px] font-semibold text-gray-450 uppercase tracking-wider">
                        {CATEGORIES.find((c) => c.value === entry.category)?.label ||
                          entry.category}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Link
                      href={`/vault/${entry.id}/edit`}
                      className="p-2 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-50 transition"
                      title="Edit"
                    >
                      <Edit3 className="w-4 h-4" />
                    </Link>
                    <button
                      onClick={() => handleDelete(entry.id)}
                      className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-55/40 transition"
                      title="Hapus"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-gray-100 text-xs">
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
                      <span className="text-gray-455 font-medium">Email</span>
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-gray-900 font-semibold truncate">{entry.email}</span>
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
                    <span className="text-gray-450 font-medium">Password</span>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-900 font-mono font-bold tracking-wider">
                        {visiblePasswords.has(entry.id)
                          ? secretEntries[entry.id]?.password
                          : "••••••••"}
                      </span>
                      <div className="flex items-center gap-0.5">
                        <button
                          onClick={() => togglePassword(entry.id, entry.id)}
                          disabled={loadingSecrets.has(entry.id)}
                          className="p-1 text-gray-400 hover:text-gray-600"
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
                    <div className="flex items-center justify-between sm:justify-start gap-4 p-2 bg-gray-50/60 rounded-xl">
                      <span className="text-gray-450 font-medium">PIN</span>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-900 font-mono font-bold tracking-wider">
                          {visiblePasswords.has(`pin-${entry.id}`)
                            ? secretEntries[entry.id]?.pin
                            : "••••"}
                        </span>
                        <div className="flex items-center gap-0.5">
                          <button
                            onClick={() => togglePassword(`pin-${entry.id}`, entry.id)}
                            className="p-1 text-gray-400 hover:text-gray-600"
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
      <BottomNav />

      {/* Mobile Bottom Sheet for Categories */}
      {showCategoriesSheet && (
        <div className="sm:hidden fixed inset-0 z-50 flex items-end justify-center">
          {/* Backdrop */}
          <div
            onClick={() => router.push("/dashboard")}
            className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
          />

          {/* Bottom Sheet Container */}
          <div className="relative w-full bg-white rounded-t-3xl shadow-xl z-10 max-h-[85vh] flex flex-col pb-safe animate-in slide-in-from-bottom duration-250">
            {/* Header Drag Handle Indicator */}
            <div className="w-12 h-1.5 bg-gray-250 rounded-full mx-auto my-3" />

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
