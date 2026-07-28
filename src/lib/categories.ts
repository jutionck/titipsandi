import {
  Globe,
  Landmark,
  Mail,
  ShoppingCart,
  CreditCard,
  Building,
  TrendingUp,
  ShieldAlert,
  Tv,
  Briefcase,
  Folder
} from "lucide-react";

export const CATEGORIES = [
  { value: "social_media", label: "Social Media", icon: Globe },
  { value: "banking", label: "Banking / M-Banking", icon: Landmark },
  { value: "email", label: "Email", icon: Mail },
  { value: "ecommerce", label: "E-Commerce", icon: ShoppingCart },
  { value: "ewallet", label: "E-Wallet", icon: CreditCard },
  { value: "government", label: "Government / BPJS", icon: Building },
  { value: "investment", label: "Investasi", icon: TrendingUp },
  { value: "insurance", label: "Asuransi", icon: ShieldAlert },
  { value: "subscription", label: "Subscription", icon: Tv },
  { value: "work", label: "Kerja / Kantor", icon: Briefcase },
  { value: "other", label: "Lainnya", icon: Folder },
] as const;

export type CategoryValue = (typeof CATEGORIES)[number]["value"];

export function getCategoryLabel(value: string) {
  return CATEGORIES.find((c) => c.value === value)?.label || value;
}

export function getCategoryIcon(value: string) {
  return CATEGORIES.find((c) => c.value === value)?.icon || Folder;
}
