import { afterEach, describe, expect, it, vi } from "vitest";
import {
  renderSecurityNotificationEmail,
  renderTransactionalEmail,
  renderTrustedContactInvitationEmail,
  renderLoginOtpEmail,
  sendPasswordRecoveryEmail,
} from "@/lib/email";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("transactional email template", () => {
  it("renders branded CTA, fallback URL, expiry, and security guidance", () => {
    const html = renderTransactionalEmail({
      preheader: "Aktifkan akun Anda.",
      eyebrow: "Selamat datang",
      title: "Verifikasi email Anda",
      intro: "Satu langkah lagi untuk memakai TitipSandi.",
      buttonLabel: "Verifikasi Email",
      url: "https://titipsandi.test/verify-email#token=abc",
      expiry: "selama 30 menit",
      securityNote: "Abaikan jika bukan Anda.",
    });

    expect(html).toContain("TitipSandi");
    expect(html).toContain("Verifikasi Email");
    expect(html).toContain("https://titipsandi.test/verify-email#token=abc");
    expect(html).toContain('src="cid:titipsandi-logo"');
    expect(html).toContain('alt="Logo TitipSandi"');
    expect(html).toContain("Berlaku selama 30 menit");
    expect(html).toContain("tidak akan pernah meminta password");
  });

  it("escapes dynamic content before inserting it into HTML", () => {
    const html = renderTransactionalEmail({
      preheader: "<script>alert(1)</script>",
      eyebrow: "Test",
      title: "Test",
      intro: "Test",
      buttonLabel: "Test",
      url: 'https://example.test/?next="><script>alert(1)</script>',
      expiry: "10 menit",
      securityNote: "Test",
    });

    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).toContain("&quot;&gt;");
  });
});

describe("security notification email template", () => {
  it("explains the password change and provides account recovery guidance", () => {
    const html = renderSecurityNotificationEmail({
      preheader: "Password Anda berubah.",
      title: "Password berhasil diubah",
      intro: "Semua sesi lama telah dicabut.",
      changedAt: "29 Juli 2026 pukul 16.30 WIB",
      securityUrl: "https://titipsandi.test/forgot-password",
    });

    expect(html).toContain("Password berhasil diubah");
    expect(html).toContain("29 Juli 2026 pukul 16.30 WIB");
    expect(html).toContain("Semua sesi lama telah dicabut");
    expect(html).toContain("Amankan akun sekarang");
    expect(html).toContain("https://titipsandi.test/forgot-password");
    expect(html).toContain('src="cid:titipsandi-logo"');
  });

  it("escapes dynamic security notification content", () => {
    const html = renderSecurityNotificationEmail({
      preheader: "<script>alert(1)</script>",
      title: "Password berubah",
      intro: "Test",
      changedAt: "Test",
      securityUrl: 'https://example.test/?next="><script>alert(1)</script>',
    });

    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).toContain("&quot;&gt;");
  });
});

describe("email delivery", () => {
  it("embeds the project icon as an inline PNG attachment", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("EMAIL_FROM", "TitipSandi <noreply@titipsandi.test>");
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await sendPasswordRecoveryEmail(
      "user@titipsandi.test",
      "https://titipsandi.test/recover#token=test",
    );

    const [, request] = fetchMock.mock.calls[0] as [string, RequestInit];
    const payload = JSON.parse(String(request.body));
    expect(payload.html).toContain('src="cid:titipsandi-logo"');
    expect(payload.attachments).toHaveLength(1);
    expect(payload.attachments[0]).toMatchObject({
      filename: "titipsandi-icon.png",
      content_id: "titipsandi-logo",
      content_type: "image/png",
    });
    expect(Buffer.from(payload.attachments[0].content, "base64").byteLength).toBeGreaterThan(1_000);
  });
});

describe("trusted contact invitation email template", () => {
  it("informs the recipient without exposing an emergency code", () => {
    const html = renderTrustedContactInvitationEmail({
      contactName: "Budi",
      ownerName: "Siti",
      relation: "Saudara",
      emergencyUrl: "https://titipsandi.test/emergency",
    });

    expect(html).toContain("Budi");
    expect(html).toContain("Siti");
    expect(html).toContain("Saudara");
    expect(html).toContain("Buka Akses Darurat");
    expect(html).toContain("https://titipsandi.test/emergency");
    expect(html).toContain("tidak menyertakan kode");
    expect(html).toContain('src="cid:titipsandi-logo"');
    expect(html).not.toMatch(/[A-F0-9]{8}(?:-[A-F0-9]{8}){3}/);
  });

  it("escapes names and relationship values", () => {
    const html = renderTrustedContactInvitationEmail({
      contactName: "<script>alert(1)</script>",
      ownerName: "Pemilik",
      relation: "<b>Keluarga</b>",
      emergencyUrl: "https://titipsandi.test/emergency",
    });

    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).not.toContain("<b>Keluarga</b>");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).toContain("&lt;b&gt;Keluarga&lt;/b&gt;");
  });
});

describe("login OTP email template", () => {
  it("renders the OTP and security guidance without putting it in a link", () => {
    const html = renderLoginOtpEmail({ code: "012345", expiresInMinutes: 5 });

    expect(html).toContain("012345");
    expect(html).toContain("5 menit");
    expect(html).toContain("hanya dapat digunakan satu kali");
    expect(html).toContain("Jangan bagikan kode");
    expect(html).toContain('src="cid:titipsandi-logo"');
    expect(html).not.toContain("token=");
  });
});
