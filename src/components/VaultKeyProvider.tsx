"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { exportVaultKeyForTab, importVaultKeyForTab } from "@/lib/client-vault-crypto";

const TAB_VAULT_STORAGE_KEY = "titipsandi:tab-vault:v1";

function clearStoredVaultKey() {
  try {
    sessionStorage.removeItem(TAB_VAULT_STORAGE_KEY);
  } catch {
    // Browser dapat menolak storage; vault di memori tetap bisa digunakan.
  }
}

type SetVaultKeyOptions = {
  recoveryKeyToSave?: string;
  rememberForTab?: boolean;
};

type VaultKeyContextValue = {
  vaultKey: CryptoKey | null;
  userId: string | null;
  recoveryKeyToSave: string | null;
  restoringVaultKey: boolean;
  setVaultKey: (key: CryptoKey, userId: string, options?: SetVaultKeyOptions) => Promise<void>;
  acknowledgeRecoveryKey: () => void;
  lockVault: () => void;
};

const VaultKeyContext = createContext<VaultKeyContextValue | null>(null);

export default function VaultKeyProvider({ children }: { children: React.ReactNode }) {
  const [unlockedVault, setUnlockedVault] = useState<{
    key: CryptoKey;
    userId: string;
    recoveryKeyToSave: string | null;
  } | null>(null);
  const [restoringVaultKey, setRestoringVaultKey] = useState(true);

  useEffect(() => {
    let active = true;

    async function restoreVaultKey() {
      try {
        const stored = sessionStorage.getItem(TAB_VAULT_STORAGE_KEY);
        if (!stored) return;

        const candidate = JSON.parse(stored) as {
          version?: unknown;
          userId?: unknown;
          encodedKey?: unknown;
        };
        if (
          candidate.version !== 1 ||
          typeof candidate.userId !== "string" ||
          typeof candidate.encodedKey !== "string"
        ) {
          throw new Error("Kunci vault tab tidak valid.");
        }

        const response = await fetch("/api/vault/key", { cache: "no-store" });
        const result = await response.json();
        if (!response.ok || result.userId !== candidate.userId) {
          throw new Error("Sesi vault tab tidak lagi valid.");
        }

        const key = await importVaultKeyForTab(candidate.encodedKey);
        if (active) {
          setUnlockedVault({
            key,
            userId: candidate.userId,
            recoveryKeyToSave: null,
          });
        }
      } catch {
        clearStoredVaultKey();
      } finally {
        if (active) setRestoringVaultKey(false);
      }
    }

    void restoreVaultKey();
    return () => {
      active = false;
    };
  }, []);

  const setVaultKey = useCallback(
    async (key: CryptoKey, userId: string, options: SetVaultKeyOptions = {}) => {
      try {
        if (options.rememberForTab) {
          const encodedKey = await exportVaultKeyForTab(key);
          sessionStorage.setItem(
            TAB_VAULT_STORAGE_KEY,
            JSON.stringify({ version: 1, userId, encodedKey }),
          );
        } else {
          clearStoredVaultKey();
        }
      } catch {
        clearStoredVaultKey();
      }

      setUnlockedVault({
        key,
        userId,
        recoveryKeyToSave: options.recoveryKeyToSave ?? null,
      });
    },
    [],
  );
  const acknowledgeRecoveryKey = useCallback(
    () =>
      setUnlockedVault((current) => (current ? { ...current, recoveryKeyToSave: null } : current)),
    [],
  );
  const lockVault = useCallback(() => {
    clearStoredVaultKey();
    setUnlockedVault(null);
  }, []);
  const value = useMemo(
    () => ({
      vaultKey: unlockedVault?.key ?? null,
      userId: unlockedVault?.userId ?? null,
      recoveryKeyToSave: unlockedVault?.recoveryKeyToSave ?? null,
      restoringVaultKey,
      setVaultKey,
      acknowledgeRecoveryKey,
      lockVault,
    }),
    [acknowledgeRecoveryKey, lockVault, restoringVaultKey, setVaultKey, unlockedVault],
  );

  return <VaultKeyContext.Provider value={value}>{children}</VaultKeyContext.Provider>;
}

export function useVaultKey() {
  const context = useContext(VaultKeyContext);

  if (!context) {
    throw new Error("useVaultKey harus digunakan di dalam VaultKeyProvider.");
  }

  return context;
}
