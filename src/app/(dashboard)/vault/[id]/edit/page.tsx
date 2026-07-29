"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CATEGORIES } from "@/lib/categories";
import LogoutButton from "@/components/LogoutButton";
import { ArrowLeft, Save, ChevronDown, Shield, Users, Plus, Info } from "lucide-react";
import { useVaultKey } from "@/components/VaultKeyProvider";
import {
  decryptClientVaultPayload,
  encryptClientVaultPayload,
  type ClientVaultPayload,
} from "@/lib/client-vault-crypto";

export default function EditVaultEntryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { vaultKey, userId } = useVaultKey();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const [form, setForm] = useState({
    category: "",
    title: "",
    username: "",
    email: "",
    password: "",
    pin: "",
    url: "",
    notes: "",
  });

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/vault/${id}`);
        if (!res.ok) {
          router.push("/dashboard");
          return;
        }
        const data = await res.json();
        if (!vaultKey || !userId) throw new Error("Vault sedang terkunci.");
        const e = await decryptClientVaultPayload(
          vaultKey,
          userId,
          id,
          data.entry.encryptedPayload,
        );
        setForm({
          category: e.category || "",
          title: e.title || "",
          username: e.username || "",
          email: e.email || "",
          password: e.password || "",
          pin: e.pin || "",
          url: e.url || "",
          notes: e.notes || "",
        });
      } catch {
        router.push("/dashboard");
      } finally {
        setFetching(false);
      }
    }
    load();
  }, [id, router, userId, vaultKey]);

  function updateForm(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (!vaultKey || !userId) {
        throw new Error("Vault sedang terkunci.");
      }
      const payload: ClientVaultPayload = {
        category: form.category,
        title: form.title.trim(),
        username: form.username.trim() || null,
        email: form.email.trim() || null,
        password: form.password,
        pin: form.pin.trim() || null,
        url: form.url.trim() || null,
        notes: form.notes.trim() || null,
      };
      const encryptedPayload = await encryptClientVaultPayload(vaultKey, userId, id, payload);
      const res = await fetch(`/api/vault/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ encryptedPayload }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }

      router.push("/dashboard");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Gagal menyimpan");
    } finally {
      setLoading(false);
    }
  }

  if (fetching) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm font-semibold text-gray-400">
        Memuat data...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-24 sm:pb-6">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-15 shadow-sm">
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
              className="text-xs font-bold text-gray-500 hover:text-gray-900 flex items-center gap-1"
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

          {/* Mobile Back Button */}
          <div className="sm:hidden flex items-center gap-2">
            <Link href="/dashboard" className="p-1 text-gray-400 hover:text-gray-900 rounded-lg">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-sm font-bold text-gray-900">Ubah Akun</h1>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6">
        <div className="max-w-2xl mx-auto">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-755 text-xs font-medium rounded-xl">
                {error}
              </div>
            )}

            <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-6 space-y-4 shadow-sm">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                  Kategori *
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none text-sm font-semibold flex items-center justify-between transition cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      {(() => {
                        const selected = CATEGORIES.find((c) => c.value === form.category);
                        if (!selected) return null;
                        const Icon = selected.icon;
                        return (
                          <>
                            <Icon className="w-4.5 h-4.5 text-gray-500" />
                            <span className="text-gray-950">{selected.label}</span>
                          </>
                        );
                      })()}
                    </span>
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  </button>

                  {isDropdownOpen && (
                    <>
                      <div
                        onClick={() => setIsDropdownOpen(false)}
                        className="fixed inset-0 z-30"
                      />
                      <div className="absolute z-45 left-0 right-0 mt-2 bg-white border border-gray-200 rounded-2xl shadow-lg max-h-60 overflow-y-auto p-1.5 space-y-0.5 animate-in fade-in zoom-in-95 duration-100">
                        {CATEGORIES.map((cat) => {
                          const Icon = cat.icon;
                          const isSelected = form.category === cat.value;
                          return (
                            <button
                              key={cat.value}
                              type="button"
                              onClick={() => {
                                updateForm("category", cat.value);
                                setIsDropdownOpen(false);
                              }}
                              className={`w-full text-left px-3 py-2 rounded-xl text-sm font-semibold flex items-center gap-2.5 transition cursor-pointer ${
                                isSelected
                                  ? "bg-gray-900 text-white"
                                  : "text-gray-700 hover:bg-gray-50"
                              }`}
                            >
                              <Icon
                                className={`w-4 h-4 ${isSelected ? "text-white" : "text-gray-500"}`}
                              />
                              <span>{cat.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                  Nama Layanan / Aplikasi *
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => updateForm("title", e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none text-sm font-semibold transition"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                    Username
                  </label>
                  <input
                    type="text"
                    value={form.username}
                    onChange={(e) => updateForm("username", e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none text-sm font-semibold transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                    Email
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => updateForm("email", e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none text-sm font-semibold transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                    Password *
                  </label>
                  <input
                    type="text"
                    value={form.password}
                    onChange={(e) => updateForm("password", e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none text-sm font-mono tracking-wide font-bold transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                    PIN
                  </label>
                  <input
                    type="text"
                    value={form.pin}
                    onChange={(e) => updateForm("pin", e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none text-sm font-mono tracking-wide font-bold transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                  Situs Web / URL
                </label>
                <input
                  type="url"
                  value={form.url}
                  onChange={(e) => updateForm("url", e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none text-sm font-semibold transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                  Catatan Tambahan
                </label>
                <textarea
                  value={form.notes}
                  onChange={(e) => updateForm("notes", e.target.value)}
                  rows={3}
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none text-sm font-semibold transition resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-3 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-800 transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{loading ? "Menyimpan..." : "Simpan Perubahan"}</span>
              </button>
              <Link
                href="/dashboard"
                className="px-6 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 transition text-center"
              >
                Batal
              </Link>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
