"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { LogOut, X } from "lucide-react";
import { useVaultKey } from "@/components/VaultKeyProvider";

interface LogoutButtonProps {
  className?: string;
  iconClassName?: string;
  label?: string;
}

export default function LogoutButton({
  className,
  iconClassName = "w-3.5 h-3.5",
  label = "Keluar",
}: LogoutButtonProps) {
  const router = useRouter();
  const { lockVault } = useVaultKey();
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;

    cancelButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isLoggingOut) {
        setIsOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isLoggingOut]);

  function openDialog() {
    setError("");
    setIsOpen(true);
  }

  function closeDialog() {
    if (isLoggingOut) return;
    setIsOpen(false);
  }

  async function handleLogout() {
    setError("");
    setIsLoggingOut(true);

    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) {
        throw new Error("Logout gagal");
      }

      lockVault();
      router.replace("/login");
      router.refresh();
    } catch {
      setError("Gagal keluar. Silakan coba kembali.");
      setIsLoggingOut(false);
    }
  }

  return (
    <>
      <button type="button" onClick={openDialog} className={className}>
        <LogOut className={iconClassName} />
        <span>{label}</span>
      </button>

      {isOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-100 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-dialog-title"
            aria-describedby="logout-dialog-description"
          >
            <button
              type="button"
              aria-label="Tutup konfirmasi keluar"
              onClick={closeDialog}
              className="absolute inset-0 bg-black/40 backdrop-blur-xs"
            />

            <div className="relative z-10 w-full max-w-sm space-y-4 rounded-3xl bg-white p-6 shadow-xl">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h2 id="logout-dialog-title" className="text-sm font-bold text-gray-900">
                  Konfirmasi Keluar
                </h2>
                <button
                  type="button"
                  onClick={closeDialog}
                  disabled={isLoggingOut}
                  aria-label="Tutup"
                  className="rounded-full p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-1">
                <p
                  id="logout-dialog-description"
                  className="text-xs font-semibold leading-relaxed text-gray-600"
                >
                  Apakah Anda yakin ingin keluar dari aplikasi TitipSandi?
                </p>
                <p className="text-[10px] text-gray-400">
                  Anda perlu memasukkan Master Password lagi untuk masuk kembali.
                </p>
                {error && <p className="pt-2 text-xs font-semibold text-red-600">{error}</p>}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="flex-1 cursor-pointer rounded-xl bg-red-600 py-2.5 text-xs font-bold text-white transition hover:bg-red-700 disabled:cursor-wait disabled:opacity-60"
                >
                  {isLoggingOut ? "Sedang keluar..." : "Ya, Keluar"}
                </button>
                <button
                  ref={cancelButtonRef}
                  type="button"
                  onClick={closeDialog}
                  disabled={isLoggingOut}
                  className="flex-1 cursor-pointer rounded-xl border border-gray-200 bg-gray-50 py-2.5 text-xs font-bold text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Batal
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
