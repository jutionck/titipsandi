"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

type VaultKeyContextValue = {
  vaultKey: CryptoKey | null;
  userId: string | null;
  recoveryKeyToSave: string | null;
  setVaultKey: (key: CryptoKey, userId: string, recoveryKeyToSave?: string) => void;
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
  const setVaultKey = useCallback(
    (key: CryptoKey, userId: string, recoveryKeyToSave?: string) =>
      setUnlockedVault({ key, userId, recoveryKeyToSave: recoveryKeyToSave ?? null }),
    [],
  );
  const acknowledgeRecoveryKey = useCallback(
    () =>
      setUnlockedVault((current) => (current ? { ...current, recoveryKeyToSave: null } : current)),
    [],
  );
  const lockVault = useCallback(() => setUnlockedVault(null), []);
  const value = useMemo(
    () => ({
      vaultKey: unlockedVault?.key ?? null,
      userId: unlockedVault?.userId ?? null,
      recoveryKeyToSave: unlockedVault?.recoveryKeyToSave ?? null,
      setVaultKey,
      acknowledgeRecoveryKey,
      lockVault,
    }),
    [acknowledgeRecoveryKey, lockVault, setVaultKey, unlockedVault],
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
