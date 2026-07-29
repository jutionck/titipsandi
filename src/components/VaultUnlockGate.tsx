"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, KeyRound, LockKeyhole } from "lucide-react";

import { useVaultKey } from "@/components/VaultKeyProvider";
import { unlockVaultKey, type ProtectedVaultKey } from "@/lib/client-vault-crypto";

type KeyState = {
  userId: string;
  protectedVaultKey: ProtectedVaultKey | null;
};

export default function VaultUnlockGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { vaultKey, setVaultKey, recoveryKeyToSave, acknowledgeRecoveryKey } = useVaultKey();
  const [recoveryCopied, setRecoveryCopied] = useState(false);
  const [keyState, setKeyState] = useState<KeyState | null>(null);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(!vaultKey);
  const [unlocking, setUnlocking] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (vaultKey) {
      return;
    }

    const controller = new AbortController();

    async function loadProtectedKey() {
      try {
        const response = await fetch("/api/vault/key", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (response.status === 401) {
          router.replace("/login");
          return;
        }

        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || "Kunci vault belum dapat dimuat.");
        }

        if (typeof result.userId !== "string") {
          throw new Error("Identitas sesi tidak valid.");
        }

        setKeyState({
          userId: result.userId,
          protectedVaultKey: result.protectedVaultKey ?? null,
        });
      } catch (caughtError) {
        if (caughtError instanceof Error && caughtError.name === "AbortError") return;
        setError(
          caughtError instanceof Error ? caughtError.message : "Kunci vault belum dapat dimuat.",
        );
      } finally {
        setLoading(false);
      }
    }

    void loadProtectedKey();
    return () => controller.abort();
  }, [router, vaultKey]);

  async function handleUnlock(event: React.FormEvent) {
    event.preventDefault();
    if (!keyState) return;

    setError("");
    setUnlocking(true);
    try {
      if (keyState.protectedVaultKey) {
        const key = await unlockVaultKey(password, keyState.userId, keyState.protectedVaultKey);
        setVaultKey(key, keyState.userId);
      } else {
        throw new Error("Akun tidak memiliki kunci vault.");
      }
      setPassword("");
    } catch {
      setError("Master password salah atau kunci vault tidak valid.");
    } finally {
      setUnlocking(false);
    }
  }

  if (vaultKey && recoveryKeyToSave) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
        <div className="w-full max-w-md space-y-5 rounded-3xl border border-amber-200 bg-white p-6 shadow-xl">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Simpan recovery key</h1>
            <p className="mt-2 text-sm leading-relaxed text-gray-600">
              Ini satu-satunya cara mempertahankan isi vault jika Master Password terlupa.
              TitipSandi tidak dapat memulihkannya untuk Anda.
            </p>
          </div>
          <code className="block break-all rounded-2xl bg-gray-100 p-4 text-sm font-bold text-gray-900">
            {recoveryKeyToSave}
          </code>
          <button
            type="button"
            onClick={async () => {
              await navigator.clipboard.writeText(recoveryKeyToSave);
              setRecoveryCopied(true);
            }}
            className="w-full rounded-xl border border-gray-300 py-3 text-sm font-bold text-gray-800"
          >
            {recoveryCopied ? "Recovery key tersalin" : "Salin recovery key"}
          </button>
          <button
            type="button"
            onClick={acknowledgeRecoveryKey}
            className="w-full rounded-xl bg-gray-900 py-3 text-sm font-bold text-white"
          >
            Saya sudah menyimpannya
          </button>
        </div>
      </main>
    );
  }

  if (vaultKey) {
    return children;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-3 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-900 text-white shadow-lg">
            {loading ? (
              <LockKeyhole className="h-6 w-6 animate-pulse" />
            ) : (
              <KeyRound className="h-6 w-6" />
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              {keyState?.protectedVaultKey ? "Buka vault" : "Amankan vault"}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-gray-500">
              {keyState?.protectedVaultKey
                ? "Masukkan Master Password untuk membuka data di perangkat ini."
                : "Buat kunci enkripsi pribadi untuk akun lama Anda."}
            </p>
          </div>
        </div>

        {loading ? (
          <p className="text-center text-sm font-medium text-gray-500">Memuat kunci vault…</p>
        ) : (
          <form onSubmit={handleUnlock} className="space-y-4">
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
                {error}
              </div>
            )}

            <div className="space-y-1">
              <label
                htmlFor="vault-unlock-password"
                className="text-xs font-semibold text-gray-600"
              >
                Master Password
              </label>
              <div className="relative">
                <input
                  id="vault-unlock-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  required
                  autoFocus
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 pr-11 text-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-gray-900"
                  placeholder="Masukkan Master Password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={unlocking || !keyState}
              className="w-full rounded-xl bg-gray-900 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-gray-800 disabled:opacity-50"
            >
              {unlocking
                ? "Membuka vault…"
                : keyState?.protectedVaultKey
                  ? "Buka vault"
                  : "Buat kunci & lanjutkan"}
            </button>

            {!keyState?.protectedVaultKey && (
              <p className="text-center text-[11px] leading-relaxed text-gray-500">
                Proses ini tidak mengirim kunci vault mentah ke server.
              </p>
            )}
          </form>
        )}
      </div>
    </main>
  );
}
