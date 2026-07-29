import VaultUnlockGate from "@/components/VaultUnlockGate";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <VaultUnlockGate>{children}</VaultUnlockGate>;
}
