"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, KeyRound, ShieldCheck, UserRoundCheck } from "lucide-react";

type MobileWelcomeProps = {
  replay?: boolean;
  onComplete: () => void;
};

const benefits = [
  {
    icon: ShieldCheck,
    title: "Terenkripsi di perangkat",
    description: "Isi vault dikunci di browser sebelum disimpan.",
  },
  {
    icon: UserRoundCheck,
    title: "Siap untuk keluarga",
    description: "Akses darurat tetap melalui persetujuan dan masa tunggu.",
  },
  {
    icon: KeyRound,
    title: "Kunci tetap milik Anda",
    description: "Master Password dan recovery key tidak dikirim ke server.",
  },
];

export default function MobileWelcome({ replay = false, onComplete }: MobileWelcomeProps) {
  return (
    <main className="min-h-[100svh] overflow-y-auto bg-gray-950 text-white md:hidden">
      <div className="mx-auto flex min-h-[100svh] w-full max-w-md flex-col px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-[calc(1rem+env(safe-area-inset-top))]">
        <header className="flex h-10 items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Image
              src="/icons/icon.svg"
              alt=""
              width={36}
              height={36}
              priority
              className="h-9 w-9 rounded-[0.65rem]"
            />
            <span className="text-sm font-extrabold tracking-tight">TitipSandi</span>
          </div>

          {replay ? (
            <Link
              href="/info"
              className="inline-flex items-center gap-1 rounded-full border border-white/15 px-3 py-1.5 text-[11px] font-bold text-gray-300 transition hover:bg-white/10 hover:text-white"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Kembali
            </Link>
          ) : (
            <span className="rounded-full bg-emerald-400/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.16em] text-emerald-300">
              Zero knowledge
            </span>
          )}
        </header>

        <section className="flex flex-1 flex-col justify-center py-7">
          <div className="relative mx-auto mb-7 flex h-32 w-32 items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-white/[0.04]" />
            <div className="absolute inset-4 rounded-full border border-white/10 bg-white/[0.04]" />
            <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-2xl shadow-black/40">
              <Image src="/icons/icon.svg" alt="" width={52} height={52} className="rounded-xl" />
            </div>
            <span className="absolute right-0 top-4 h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_18px_4px_rgba(52,211,153,0.4)]" />
            <span className="absolute bottom-3 left-2 h-1.5 w-1.5 rounded-full bg-gray-500" />
          </div>

          <div className="text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-gray-400">
              Brankas digital keluarga
            </p>
            <h1 className="mx-auto mt-3 max-w-xs text-3xl font-black leading-[1.08] tracking-tight">
              Password penting.
              <span className="block text-emerald-300">Tetap milik Anda.</span>
            </h1>
            <p className="mx-auto mt-4 max-w-xs text-sm leading-relaxed text-gray-400">
              Simpan akun dan PIN secara terenkripsi, lalu siapkan akses yang aman untuk orang
              terpercaya saat benar-benar dibutuhkan.
            </p>
          </div>

          <div className="mt-7 space-y-2.5">
            {benefits.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.045] px-3.5 py-3"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-emerald-300">
                  <Icon className="h-4.5 w-4.5" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-xs font-bold text-white">{title}</h2>
                  <p className="mt-0.5 text-[10px] leading-relaxed text-gray-400">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <footer className="space-y-2.5">
          <p className="px-2 text-center text-[10px] leading-relaxed text-amber-200/75">
            Simpan recovery key dengan baik. Demi keamanan, TitipSandi tidak dapat membukakan vault
            jika kunci Anda hilang.
          </p>
          <Link
            href="/register"
            onClick={onComplete}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3.5 text-sm font-extrabold text-gray-950 shadow-xl shadow-black/20 transition active:scale-[0.99]"
          >
            Mulai dengan Aman
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/login"
            onClick={onComplete}
            className="block w-full rounded-2xl border border-white/15 px-4 py-3 text-center text-sm font-bold text-gray-200 transition hover:bg-white/5 active:scale-[0.99]"
          >
            Saya sudah punya akun
          </Link>
        </footer>
      </div>
    </main>
  );
}
