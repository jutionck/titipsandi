"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import LogoutButton from "@/components/LogoutButton";
import {
  Trash2,
  Copy,
  Check,
  ShieldAlert,
  UserPlus,
  X,
  Clock,
  ShieldCheck,
  Shield,
  Users,
  Plus,
  Info,
  ChevronDown,
} from "lucide-react";

interface TrustedContact {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  relation: string;
  isActivated: boolean;
  activatedAt: string | null;
  createdAt: string;
}

export default function TrustedContactsPage() {
  const router = useRouter();
  const [contacts, setContacts] = useState<TrustedContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState("");
  const [emergencyCode, setEmergencyCode] = useState("");
  const [invitationRecipient, setInvitationRecipient] = useState("");
  const [isRelationOpen, setIsRelationOpen] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    relation: "",
  });

  const fetchContacts = useCallback(async () => {
    try {
      const res = await fetch("/api/trusted");
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      const data = await res.json();
      setContacts(data.contacts || []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      await fetchContacts();
    };
    if (active) {
      load();
    }
    return () => {
      active = false;
    };
  }, [fetchContacts]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);

    try {
      const res = await fetch("/api/trusted", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }

      setEmergencyCode(data.emergencyCode);
      setInvitationRecipient(data.invitationRecipient || data.contact.email);
      setForm({ name: "", email: "", phone: "", relation: "" });
      setShowForm(false);
      fetchContacts();
    } catch {
      setError("Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Yakin ingin menghapus kontak darurat ini?")) return;
    await fetch(`/api/trusted/${id}`, { method: "DELETE" });
    fetchContacts();
  }

  async function copyCode(code: string, id: string) {
    await navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(""), 2000);
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-24 sm:pb-6">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
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
              className="text-xs font-bold text-gray-900 hover:text-gray-900 flex items-center gap-1"
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
            Keluarga
          </span>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6 space-y-6">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3 items-start">
          <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-amber-800 leading-relaxed font-medium">
            <strong>Penting:</strong> Kode darurat hanya ditampilkan satu kali saat kontak dibuat.
            Simpan dan bagikan melalui kanal yang aman; kode ini memberikan akses ke isi brankas.
          </div>
        </div>

        {emergencyCode && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl space-y-3">
            <div>
              <p className="text-xs font-bold text-red-800 uppercase tracking-wider">
                Simpan kode ini sekarang
              </p>
              <p className="text-xs text-red-700 mt-1">
                Demi keamanan, server hanya menyimpan hash dan tidak dapat menampilkan kode ini
                lagi.
              </p>
              {invitationRecipient && (
                <p className="text-xs text-red-700 mt-1">
                  Email pemberitahuan sedang dikirim ke{" "}
                  <strong className="font-bold">{invitationRecipient}</strong>. Kode darurat tidak
                  disertakan dan tetap harus Anda bagikan melalui kanal yang aman.
                </p>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
              <code className="flex-1 p-3 bg-white border border-red-200 rounded-xl font-mono text-sm font-bold tracking-wider break-all select-text">
                {emergencyCode}
              </code>
              <button
                type="button"
                onClick={() => copyCode(emergencyCode, "new-code")}
                className="inline-flex justify-center items-center gap-1.5 px-4 py-3 bg-red-600 text-white rounded-xl text-xs font-semibold"
              >
                {copiedId === "new-code" ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                {copiedId === "new-code" ? "Tersalin" : "Salin kode"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmergencyCode("");
                  setInvitationRecipient("");
                }}
                className="px-4 py-3 border border-red-200 text-red-700 rounded-xl text-xs font-semibold"
              >
                Sudah disimpan
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
            Kontak Terpercaya ({contacts.length})
          </h2>
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white rounded-lg text-xs font-semibold hover:bg-gray-800 transition"
          >
            {showForm ? <X className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
            <span>{showForm ? "Batal" : "Tambah"}</span>
          </button>
        </div>

        {showForm && (
          <form
            onSubmit={handleSubmit}
            className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-5 space-y-4 shadow-sm"
          >
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-medium rounded-xl">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                  Nama Lengkap *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  required
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none text-sm font-semibold transition"
                  placeholder="Nama"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                  Hubungan *
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsRelationOpen(!isRelationOpen)}
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none text-sm font-semibold flex items-center justify-between transition cursor-pointer"
                  >
                    <span className={form.relation ? "text-gray-950" : "text-gray-400"}>
                      {form.relation || "Pilih Hubungan"}
                    </span>
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  </button>

                  {isRelationOpen && (
                    <>
                      <div
                        onClick={() => setIsRelationOpen(false)}
                        className="fixed inset-0 z-30"
                      />
                      <div className="absolute z-45 left-0 right-0 mt-2 bg-white border border-gray-200 rounded-2xl shadow-lg max-h-60 overflow-y-auto p-1.5 space-y-0.5 animate-in fade-in zoom-in-95 duration-100">
                        {["Istri", "Suami", "Anak", "Orang Tua", "Saudara", "Lainnya"].map(
                          (rel) => {
                            const isSelected = form.relation === rel;
                            return (
                              <button
                                key={rel}
                                type="button"
                                onClick={() => {
                                  setForm((prev) => ({ ...prev, relation: rel }));
                                  setIsRelationOpen(false);
                                }}
                                className={`w-full text-left px-3 py-2 rounded-xl text-sm font-semibold transition cursor-pointer ${
                                  isSelected
                                    ? "bg-gray-900 text-white"
                                    : "text-gray-700 hover:bg-gray-50"
                                }`}
                              >
                                {rel}
                              </button>
                            );
                          },
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                  Email *
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                  required
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none text-sm font-semibold transition"
                  placeholder="email@contoh.com"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                  Nomor Telepon / WhatsApp
                </label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none text-sm font-semibold transition"
                  placeholder="0812..."
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-3 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-800 transition disabled:opacity-50"
            >
              {saving ? "Menyimpan..." : "Simpan Kontak"}
            </button>
          </form>
        )}

        {loading ? (
          <div className="text-center py-12 text-sm text-gray-405 font-medium">Memuat data...</div>
        ) : contacts.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center space-y-2 shadow-sm">
            <p className="text-sm font-bold text-gray-900">Belum ada kontak darurat</p>
            <p className="text-xs text-gray-500">
              Mulai daftarkan keluarga terdekat untuk mewariskan password Anda.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {contacts.map((contact) => (
              <div
                key={contact.id}
                className="bg-white border border-gray-250/70 rounded-2xl p-4 shadow-sm flex flex-col gap-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">{contact.name}</h3>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mt-0.5">
                      {contact.relation}
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      {contact.email} {contact.phone && `· ${contact.phone}`}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(contact.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {contact.isActivated ? (
                  <div className="inline-flex items-center gap-1.5 text-[10px] text-amber-600 bg-amber-50 py-1.5 px-3 rounded-lg border border-amber-100 font-medium">
                    <Clock className="w-3.5 h-3.5" />
                    <span>
                      Telah diakses pada{" "}
                      {new Date(contact.activatedAt!).toLocaleDateString("id-ID")}
                    </span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1.5 text-[10px] text-green-600 bg-green-50 py-1.5 px-3 rounded-lg border border-green-100 font-medium w-fit">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Aktif & Menunggu</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
