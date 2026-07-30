"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { startAuthentication } from "@simplewebauthn/browser";
import { Shield, Lock, Mail, ArrowLeft, Eye, EyeOff, Fingerprint, KeyRound } from "lucide-react";
import { deriveAuthenticationSecret, unlockVaultKey } from "@/lib/client-vault-crypto";
import { useVaultKey } from "@/components/VaultKeyProvider";

export default function LoginPage() {
  const router = useRouter();
  const { setVaultKey } = useVaultKey();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otpDigits, setOtpDigits] = useState<string[]>(() => Array(6).fill(""));
  const otpInputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const otp = otpDigits.join("");
  const [step, setStep] = useState<"credentials" | "otp">("credentials");
  const [otpMethod, setOtpMethod] = useState<"email" | "totp">("email");
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendingOtp, setResendingOtp] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [resendingVerification, setResendingVerification] = useState(false);
  const [canResendVerification, setCanResendVerification] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberVaultForTab, setRememberVaultForTab] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setCanResendVerification(false);
    setLoading(true);

    try {
      const authenticationSecret = await deriveAuthenticationSecret(password, email);
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, authenticationSecret }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        setCanResendVerification(res.status === 403);
        return;
      }

      if (data.requiresOtp) {
        setStep("otp");
        setOtpMethod(data.otpMethod === "totp" ? "totp" : "email");
        setRecoveryMode(false);
        setRecoveryCode("");
        setOtpDigits(Array(6).fill(""));
        setMaskedEmail(data.maskedEmail || "email Anda");
        setError("");
        return;
      }
      setError("Respons login tidak valid.");
    } catch {
      setError("Gagal terhubung ke server");
    } finally {
      setLoading(false);
    }
  }

  async function handleOtpSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: recoveryMode ? recoveryCode : otp }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error);
        return;
      }

      if (typeof result.userId !== "string") {
        setError("Identitas vault tidak valid.");
        return;
      }

      if (result.protectedVaultKey) {
        const unlockedKey = await unlockVaultKey(password, result.userId, result.protectedVaultKey);
        await setVaultKey(unlockedKey, result.userId, {
          rememberForTab: rememberVaultForTab,
        });
      } else {
        setError("Akun legacy tidak memiliki kunci vault dan tidak dapat digunakan pada cutover.");
        return;
      }

      setPassword("");
      router.replace("/dashboard");
      router.refresh();
    } catch {
      setError("Gagal memverifikasi kode OTP.");
    } finally {
      setLoading(false);
    }
  }

  async function resendOtp() {
    setError("");
    setResendingOtp(true);
    try {
      const response = await fetch("/api/auth/login/otp/resend", { method: "POST" });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error);
        return;
      }
      setOtpDigits(Array(6).fill(""));
      setMaskedEmail(result.maskedEmail || maskedEmail);
      setError(result.message);
    } catch {
      setError("Gagal mengirim ulang kode OTP.");
    } finally {
      setResendingOtp(false);
    }
  }

  function changeAccount() {
    setStep("credentials");
    setOtpDigits(Array(6).fill(""));
    setOtpMethod("email");
    setRecoveryMode(false);
    setRecoveryCode("");
    setMaskedEmail("");
    setError("");
  }

  function updateOtpDigit(index: number, value: string) {
    const digits = value.replace(/\D/g, "");
    if (digits.length > 1) {
      const next = Array(6).fill("");
      digits
        .slice(0, 6)
        .split("")
        .forEach((digit, digitIndex) => {
          next[digitIndex] = digit;
        });
      setOtpDigits(next);
      otpInputRefs.current[Math.min(digits.length, 6) - 1]?.focus();
      return;
    }

    setOtpDigits((current) => {
      const next = [...current];
      next[index] = digits;
      return next;
    });
    if (digits && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  }

  function handleOtpKeyDown(index: number, event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace" && !otpDigits[index] && index > 0) {
      setOtpDigits((current) => {
        const next = [...current];
        next[index - 1] = "";
        return next;
      });
      otpInputRefs.current[index - 1]?.focus();
    } else if (event.key === "ArrowLeft" && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    } else if (event.key === "ArrowRight" && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  }

  function handleOtpPaste(event: React.ClipboardEvent<HTMLInputElement>) {
    const digits = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!digits) return;
    event.preventDefault();
    const next = Array(6).fill("");
    digits.split("").forEach((digit, index) => {
      next[index] = digit;
    });
    setOtpDigits(next);
    otpInputRefs.current[Math.min(digits.length, 6) - 1]?.focus();
  }

  async function resendVerification() {
    setResendingVerification(true);
    try {
      const response = await fetch("/api/auth/email/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const result = await response.json();
      setError(response.ok ? result.message : result.error);
    } catch {
      setError("Gagal mengirim ulang tautan verifikasi.");
    } finally {
      setResendingVerification(false);
    }
  }

  async function handlePasskeyLogin() {
    setError("");
    if (!window.PublicKeyCredential || !window.isSecureContext) {
      setError("Passkey memerlukan browser modern melalui HTTPS.");
      return;
    }

    setPasskeyLoading(true);
    try {
      const optionsResponse = await fetch("/api/auth/passkeys/login/options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const options = await optionsResponse.json();
      if (!optionsResponse.ok) throw new Error(options.error);

      const authenticationResponse = await startAuthentication({
        optionsJSON: options,
      });
      const verifyResponse = await fetch("/api/auth/passkeys/login/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response: authenticationResponse }),
      });
      const result = await verifyResponse.json();
      if (!verifyResponse.ok) throw new Error(result.error);

      router.replace("/dashboard");
      router.refresh();
    } catch (caughtError) {
      const text =
        caughtError instanceof Error && caughtError.name === "NotAllowedError"
          ? "Passkey tidak ditemukan untuk alamat aplikasi ini. Gunakan domain yang sama seperti saat passkey diaktifkan."
          : caughtError instanceof Error
            ? caughtError.message
            : "Login dengan passkey gagal.";
      setError(text);
    } finally {
      setPasskeyLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-between p-6">
      <div className="w-full max-w-sm mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-gray-500 hover:text-gray-900 mb-8 py-1.5 px-3 bg-white border border-gray-200 rounded-full transition shadow-sm"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Kembali
        </Link>
      </div>

      <div className="max-w-sm w-full mx-auto space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 bg-gray-900 text-white rounded-xl flex items-center justify-center shadow-md">
            {step === "otp" ? <KeyRound className="w-6 h-6" /> : <Shield className="w-6 h-6" />}
          </div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
            {step === "otp" ? "Verifikasi login" : "Selamat Datang"}
          </h2>
          <p className="text-sm text-gray-500">
            {step === "otp"
              ? otpMethod === "totp"
                ? recoveryMode
                  ? "Masukkan salah satu recovery code Anda"
                  : "Masukkan kode 6 digit dari aplikasi authenticator"
                : `Masukkan kode 6 digit yang dikirim ke ${maskedEmail}`
              : "Masuk untuk mengakses brankas pribadi Anda"}
          </p>
        </div>

        {step === "credentials" ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="space-y-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700">
                <p>{error}</p>
                {canResendVerification && (
                  <button
                    type="button"
                    onClick={resendVerification}
                    disabled={resendingVerification}
                    className="font-bold underline disabled:opacity-50"
                  >
                    {resendingVerification ? "Mengirim..." : "Kirim ulang tautan verifikasi"}
                  </button>
                )}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-600">Email</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none text-sm transition"
                  placeholder="email@contoh.com"
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-gray-600">Master Password</label>
                <Link
                  href="/forgot-password"
                  className="text-[11px] font-semibold text-gray-600 hover:text-gray-900 hover:underline"
                >
                  Lupa password?
                </Link>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pl-9 pr-10 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none text-sm transition"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-700 cursor-pointer"
                  aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                  aria-pressed={showPassword}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <label className="flex cursor-pointer items-start gap-2.5 rounded-xl bg-gray-100 p-3">
              <input
                type="checkbox"
                checked={rememberVaultForTab}
                onChange={(event) => setRememberVaultForTab(event.target.checked)}
                className="mt-0.5 h-4 w-4 accent-gray-900"
              />
              <span>
                <span className="block text-xs font-semibold text-gray-700">
                  Ingat vault sampai tab ditutup
                </span>
                <span className="mt-0.5 block text-[10px] leading-relaxed text-gray-500">
                  Refresh tidak akan meminta Master Password lagi pada tab ini.
                </span>
              </span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gray-900 text-white rounded-xl font-semibold text-sm hover:bg-gray-800 active:scale-[0.99] transition disabled:opacity-50 shadow-md shadow-gray-900/10"
            >
              {loading ? "Memproses..." : "Masuk"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleOtpSubmit} className="space-y-4">
            {error && (
              <div
                className={`rounded-xl border p-3 text-xs font-medium ${
                  error.includes("dikirim")
                    ? "border-green-200 bg-green-50 text-green-700"
                    : "border-red-200 bg-red-50 text-red-700"
                }`}
              >
                {error}
              </div>
            )}

            <div className="space-y-1">
              <label
                htmlFor={recoveryMode ? "login-recovery-code" : "login-otp-0"}
                className="text-xs font-semibold text-gray-600"
              >
                {recoveryMode
                  ? "Recovery code"
                  : otpMethod === "totp"
                    ? "Kode authenticator"
                    : "Kode OTP"}
              </label>
              {recoveryMode ? (
                <input
                  id="login-recovery-code"
                  value={recoveryCode}
                  onChange={(event) =>
                    setRecoveryCode(event.target.value.toUpperCase().slice(0, 20))
                  }
                  autoComplete="one-time-code"
                  autoCapitalize="characters"
                  spellCheck={false}
                  placeholder="ABCD-EFGH-IJKL"
                  autoFocus
                  required
                  className="h-14 w-full rounded-xl border border-gray-200 bg-white text-center font-mono text-base font-bold uppercase tracking-wider text-gray-900 outline-none transition focus:border-transparent focus:ring-2 focus:ring-gray-900"
                />
              ) : (
                <div className="grid grid-cols-6 gap-2" role="group" aria-label="Kode 6 digit">
                  {otpDigits.map((digit, index) => (
                    <input
                      key={index}
                      ref={(element) => {
                        otpInputRefs.current[index] = element;
                      }}
                      id={`login-otp-${index}`}
                      type="text"
                      inputMode="numeric"
                      autoComplete={index === 0 ? "one-time-code" : "off"}
                      pattern="[0-9]*"
                      maxLength={index === 0 ? 6 : 1}
                      value={digit}
                      onChange={(event) => updateOtpDigit(index, event.target.value)}
                      onKeyDown={(event) => handleOtpKeyDown(index, event)}
                      onPaste={handleOtpPaste}
                      required
                      autoFocus={index === 0}
                      aria-label={`Digit kode ${index + 1}`}
                      className="h-14 min-w-0 w-full rounded-xl border border-gray-200 bg-white text-center font-mono text-xl font-bold text-gray-900 outline-none transition focus:border-transparent focus:ring-2 focus:ring-gray-900"
                    />
                  ))}
                </div>
              )}
              <p className="text-xs leading-relaxed text-gray-500">
                {recoveryMode
                  ? "Setiap recovery code hanya dapat digunakan satu kali."
                  : otpMethod === "totp"
                    ? "Kode authenticator berubah setiap 30 detik."
                    : "Kode email berlaku selama 5 menit dan hanya dapat digunakan satu kali."}
              </p>
            </div>

            <button
              type="submit"
              disabled={
                loading || (recoveryMode ? recoveryCode.trim().length < 12 : otp.length !== 6)
              }
              className="w-full rounded-xl bg-gray-900 py-3 text-sm font-semibold text-white shadow-md shadow-gray-900/10 transition hover:bg-gray-800 disabled:opacity-50"
            >
              {loading ? "Memverifikasi..." : "Verifikasi & masuk"}
            </button>

            <div className="flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={changeAccount}
                className="font-semibold text-gray-500 hover:text-gray-900 hover:underline"
              >
                Gunakan akun lain
              </button>
              {otpMethod === "email" ? (
                <button
                  type="button"
                  onClick={resendOtp}
                  disabled={resendingOtp}
                  className="font-bold text-gray-700 hover:text-gray-900 hover:underline disabled:opacity-50"
                >
                  {resendingOtp ? "Mengirim..." : "Kirim ulang kode"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setRecoveryMode((current) => !current);
                    setRecoveryCode("");
                    setOtpDigits(Array(6).fill(""));
                    setError("");
                  }}
                  className="font-bold text-gray-700 hover:text-gray-900 hover:underline"
                >
                  {recoveryMode ? "Gunakan authenticator" : "Gunakan recovery code"}
                </button>
              )}
            </div>
          </form>
        )}

        {step === "credentials" && (
          <>
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-gray-200" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                atau
              </span>
              <div className="h-px flex-1 bg-gray-200" />
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={handlePasskeyLogin}
                disabled={passkeyLoading || loading}
                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white py-3 text-sm font-bold text-gray-800 shadow-sm transition hover:bg-gray-50 disabled:cursor-wait disabled:opacity-60"
              >
                <Fingerprint className="h-4.5 w-4.5" />
                {passkeyLoading ? "Memverifikasi..." : "Masuk dengan Passkey"}
              </button>
              <p className="text-center text-[10px] leading-relaxed text-gray-400">
                Tidak perlu mengisi email. Gunakan Face ID, sidik jari, Windows Hello, atau PIN
                perangkat setelah diaktifkan dari halaman Keamanan.
              </p>
            </div>

            <p className="text-center text-xs text-gray-500">
              Belum punya akun?{" "}
              <Link href="/register" className="text-gray-900 font-bold hover:underline">
                Daftar
              </Link>
            </p>
          </>
        )}
      </div>

      <div />
    </div>
  );
}
