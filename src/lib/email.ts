import { readFile } from "node:fs/promises";
import { join } from "node:path";

const EMAIL_LOGO_CONTENT_ID = "titipsandi-logo";
let emailLogoContentPromise: Promise<string> | undefined;

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      (
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#039;",
        }) as Record<string, string>
      )[character],
  );
}

function renderEmailBrand() {
  return `<table role="presentation" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td width="40" height="40" style="border-radius:10px;background:#111827;">
                      <img src="cid:${EMAIL_LOGO_CONTENT_ID}" width="40" height="40" alt="Logo TitipSandi" style="display:block;width:40px;height:40px;border:0;border-radius:10px;">
                    </td>
                    <td style="padding-left:12px;font-size:18px;font-weight:800;letter-spacing:-0.3px;color:#111827;">TitipSandi</td>
                  </tr>
                </table>`;
}

type TransactionalEmail = {
  preheader: string;
  eyebrow: string;
  title: string;
  intro: string;
  buttonLabel: string;
  url: string;
  expiry: string;
  securityNote: string;
};

export function renderTransactionalEmail(input: TransactionalEmail) {
  const safeUrl = escapeHtml(input.url);
  return `<!doctype html>
<html lang="id">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="light">
    <title>${escapeHtml(input.title)}</title>
  </head>
  <body style="margin:0;padding:0;background:#f3f4f6;color:#111827;font-family:Arial,Helvetica,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(input.preheader)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f3f4f6;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;">
            <tr>
              <td style="padding:0 0 16px;">
                ${renderEmailBrand()}
              </td>
            </tr>
            <tr>
              <td style="border:1px solid #e5e7eb;border-radius:20px;background:#ffffff;padding:36px 32px;box-shadow:0 8px 24px rgba(17,24,39,0.06);">
                <p style="margin:0 0 10px;color:#6b7280;font-size:12px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;">${escapeHtml(input.eyebrow)}</p>
                <h1 style="margin:0 0 16px;color:#111827;font-size:28px;line-height:1.25;letter-spacing:-0.7px;">${escapeHtml(input.title)}</h1>
                <p style="margin:0 0 26px;color:#4b5563;font-size:15px;line-height:1.7;">${escapeHtml(input.intro)}</p>
                <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td align="center" style="border-radius:12px;background:#111827;">
                      <a href="${safeUrl}" style="display:inline-block;padding:14px 24px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;">${escapeHtml(input.buttonLabel)}</a>
                    </td>
                  </tr>
                </table>
                <p style="margin:24px 0 8px;color:#6b7280;font-size:12px;line-height:1.6;">Jika tombol tidak berfungsi, salin tautan berikut ke browser:</p>
                <p style="margin:0;word-break:break-all;color:#374151;font-size:11px;line-height:1.6;"><a href="${safeUrl}" style="color:#374151;">${safeUrl}</a></p>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:28px;">
                  <tr>
                    <td style="border-radius:12px;background:#f9fafb;padding:14px 16px;color:#4b5563;font-size:12px;line-height:1.6;">
                      <strong style="color:#111827;">Berlaku ${escapeHtml(input.expiry)}.</strong>
                      Tautan ini hanya dapat digunakan satu kali.
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 8px 0;color:#6b7280;font-size:11px;line-height:1.6;">
                <strong style="color:#374151;">Catatan keamanan:</strong> ${escapeHtml(input.securityNote)}
                TitipSandi tidak akan pernah meminta password Anda melalui email.
                <br><br>
                Email otomatis dari TitipSandi. Mohon tidak membalas email ini.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

type SecurityNotificationEmail = {
  preheader: string;
  title: string;
  intro: string;
  changedAt: string;
  securityUrl: string;
};

export function renderSecurityNotificationEmail(input: SecurityNotificationEmail) {
  const safeSecurityUrl = escapeHtml(input.securityUrl);
  return `<!doctype html>
<html lang="id">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="light">
    <title>${escapeHtml(input.title)}</title>
  </head>
  <body style="margin:0;padding:0;background:#f3f4f6;color:#111827;font-family:Arial,Helvetica,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(input.preheader)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f3f4f6;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;">
            <tr>
              <td style="padding:0 0 16px;">
                ${renderEmailBrand()}
              </td>
            </tr>
            <tr>
              <td style="border:1px solid #e5e7eb;border-radius:20px;background:#ffffff;padding:36px 32px;box-shadow:0 8px 24px rgba(17,24,39,0.06);">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin-bottom:20px;">
                  <tr>
                    <td width="44" height="44" align="center" style="border-radius:14px;background:#ecfdf5;color:#047857;font-size:24px;font-weight:800;">✓</td>
                  </tr>
                </table>
                <p style="margin:0 0 10px;color:#047857;font-size:12px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;">Aktivitas keamanan</p>
                <h1 style="margin:0 0 16px;color:#111827;font-size:28px;line-height:1.25;letter-spacing:-0.7px;">${escapeHtml(input.title)}</h1>
                <p style="margin:0 0 24px;color:#4b5563;font-size:15px;line-height:1.7;">${escapeHtml(input.intro)}</p>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom:26px;">
                  <tr>
                    <td style="border-radius:12px;background:#f9fafb;padding:14px 16px;color:#4b5563;font-size:12px;line-height:1.6;">
                      <strong style="display:block;color:#111827;font-size:13px;">Waktu perubahan</strong>
                      ${escapeHtml(input.changedAt)}
                    </td>
                  </tr>
                </table>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td style="border:1px solid #fecaca;border-radius:12px;background:#fef2f2;padding:16px;color:#991b1b;font-size:13px;line-height:1.6;">
                      <strong style="display:block;margin-bottom:4px;color:#7f1d1d;">Bukan Anda yang melakukan perubahan ini?</strong>
                      Segera pulihkan akun Anda kembali. Semua sesi lama telah dicabut untuk membantu melindungi akun.
                      <br><br>
                      <a href="${safeSecurityUrl}" style="color:#991b1b;font-weight:700;">Amankan akun sekarang →</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 8px 0;color:#6b7280;font-size:11px;line-height:1.6;">
                <strong style="color:#374151;">Catatan keamanan:</strong>
                TitipSandi tidak akan pernah meminta password Anda melalui email.
                <br><br>
                Email otomatis dari TitipSandi. Mohon tidak membalas email ini.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

type TrustedContactInvitationEmail = {
  contactName: string;
  ownerName: string;
  relation: string;
  emergencyUrl: string;
};

export function renderTrustedContactInvitationEmail(input: TrustedContactInvitationEmail) {
  const safeEmergencyUrl = escapeHtml(input.emergencyUrl);
  return `<!doctype html>
<html lang="id">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="light">
    <title>Anda ditambahkan sebagai kontak darurat</title>
  </head>
  <body style="margin:0;padding:0;background:#f3f4f6;color:#111827;font-family:Arial,Helvetica,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(input.ownerName)} menambahkan Anda sebagai kontak darurat di TitipSandi.</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f3f4f6;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;">
            <tr>
              <td style="padding:0 0 16px;">
                ${renderEmailBrand()}
              </td>
            </tr>
            <tr>
              <td style="border:1px solid #e5e7eb;border-radius:20px;background:#ffffff;padding:36px 32px;box-shadow:0 8px 24px rgba(17,24,39,0.06);">
                <p style="margin:0 0 10px;color:#6b7280;font-size:12px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;">Kontak darurat</p>
                <h1 style="margin:0 0 16px;color:#111827;font-size:28px;line-height:1.25;letter-spacing:-0.7px;">Anda dipercaya oleh keluarga</h1>
                <p style="margin:0 0 24px;color:#4b5563;font-size:15px;line-height:1.7;">
                  Halo <strong style="color:#111827;">${escapeHtml(input.contactName)}</strong>,
                  <strong style="color:#111827;">${escapeHtml(input.ownerName)}</strong> telah menambahkan Anda sebagai kontak darurat di TitipSandi.
                </p>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom:26px;">
                  <tr>
                    <td style="border-radius:12px;background:#f9fafb;padding:14px 16px;color:#4b5563;font-size:12px;line-height:1.6;">
                      <strong style="display:block;color:#111827;font-size:13px;">Hubungan yang dicatat</strong>
                      ${escapeHtml(input.relation)}
                    </td>
                  </tr>
                </table>
                <p style="margin:0 0 20px;color:#4b5563;font-size:13px;line-height:1.7;">
                  Pemilik akun akan membagikan kode darurat kepada Anda melalui kanal terpisah yang aman. Simpan kode tersebut secara pribadi dan gunakan hanya saat benar-benar diperlukan.
                </p>
                <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td align="center" style="border-radius:12px;background:#111827;">
                      <a href="${safeEmergencyUrl}" style="display:inline-block;padding:14px 24px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;">Buka Akses Darurat</a>
                    </td>
                  </tr>
                </table>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:28px;">
                  <tr>
                    <td style="border:1px solid #fde68a;border-radius:12px;background:#fffbeb;padding:14px 16px;color:#92400e;font-size:12px;line-height:1.6;">
                      <strong style="display:block;color:#78350f;">Jaga kode darurat tetap rahasia.</strong>
                      TitipSandi tidak menyertakan kode tersebut di email ini dan tidak akan pernah memintanya melalui email.
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 8px 0;color:#6b7280;font-size:11px;line-height:1.6;">
                Jika Anda tidak mengenal pengirim atau tidak mengharapkan pemberitahuan ini, abaikan email dan hubungi pengirim secara langsung.
                <br><br>
                Email otomatis dari TitipSandi. Mohon tidak membalas email ini.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

type LoginOtpEmail = {
  code: string;
  expiresInMinutes: number;
};

export function renderLoginOtpEmail(input: LoginOtpEmail) {
  return `<!doctype html>
<html lang="id">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="light">
    <title>Kode verifikasi login TitipSandi</title>
  </head>
  <body style="margin:0;padding:0;background:#f3f4f6;color:#111827;font-family:Arial,Helvetica,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">Gunakan kode ini untuk menyelesaikan login TitipSandi Anda.</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f3f4f6;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;">
            <tr>
              <td style="padding:0 0 16px;">
                ${renderEmailBrand()}
              </td>
            </tr>
            <tr>
              <td style="border:1px solid #e5e7eb;border-radius:20px;background:#ffffff;padding:36px 32px;box-shadow:0 8px 24px rgba(17,24,39,0.06);">
                <p style="margin:0 0 10px;color:#6b7280;font-size:12px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;">Verifikasi dua langkah</p>
                <h1 style="margin:0 0 16px;color:#111827;font-size:28px;line-height:1.25;letter-spacing:-0.7px;">Konfirmasi login Anda</h1>
                <p style="margin:0 0 24px;color:#4b5563;font-size:15px;line-height:1.7;">
                  Password Anda telah diverifikasi. Masukkan kode berikut untuk menyelesaikan login:
                </p>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td align="center" style="border:1px solid #d1d5db;border-radius:14px;background:#f9fafb;padding:20px 16px;color:#111827;font-family:Courier New,monospace;font-size:32px;font-weight:800;letter-spacing:8px;">
                      ${escapeHtml(input.code)}
                    </td>
                  </tr>
                </table>
                <p style="margin:20px 0 0;color:#4b5563;font-size:13px;line-height:1.7;">
                  Kode berlaku selama <strong style="color:#111827;">${input.expiresInMinutes} menit</strong> dan hanya dapat digunakan satu kali.
                </p>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:26px;">
                  <tr>
                    <td style="border:1px solid #fecaca;border-radius:12px;background:#fef2f2;padding:14px 16px;color:#991b1b;font-size:12px;line-height:1.6;">
                      <strong style="display:block;color:#7f1d1d;">Tidak merasa sedang login?</strong>
                      Jangan bagikan kode ini kepada siapa pun. Segera ubah password akun Anda.
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 8px 0;color:#6b7280;font-size:11px;line-height:1.6;">
                TitipSandi tidak akan pernah meminta kode OTP atau password Anda melalui email, telepon, maupun chat.
                <br><br>
                Email otomatis dari TitipSandi. Mohon tidak membalas email ini.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export async function sendPasswordRecoveryEmail(to: string, recoveryUrl: string) {
  return sendEmail({
    to,
    subject: "Pulihkan akun TitipSandi",
    text: [
      "Kami menerima permintaan pemulihan akun TitipSandi.",
      "",
      `Buka tautan ini dalam 10 menit: ${recoveryUrl}`,
      "",
      "Jika Anda tidak meminta pemulihan, abaikan email ini.",
    ].join("\n"),
    html: renderTransactionalEmail({
      preheader: "Gunakan tautan aman ini untuk memulihkan akun TitipSandi Anda.",
      eyebrow: "Pemulihan akun",
      title: "Buat password baru",
      intro:
        "Kami menerima permintaan untuk mengganti password akun Anda. Lanjutkan hanya jika permintaan ini memang berasal dari Anda.",
      buttonLabel: "Pulihkan Akun",
      url: recoveryUrl,
      expiry: "selama 10 menit",
      securityNote: "Jika Anda tidak meminta pemulihan akun, abaikan email ini.",
    }),
  });
}

export async function sendEmailVerificationEmail(to: string, verificationUrl: string) {
  return sendEmail({
    to,
    subject: "Verifikasi email Anda • TitipSandi",
    text: [
      "Selamat datang di TitipSandi.",
      "",
      `Verifikasi email Anda dalam 30 menit: ${verificationUrl}`,
      "",
      "Jika Anda tidak membuat akun TitipSandi, abaikan email ini.",
    ].join("\n"),
    html: renderTransactionalEmail({
      preheader: "Satu langkah lagi untuk mengaktifkan akun TitipSandi Anda.",
      eyebrow: "Selamat datang",
      title: "Verifikasi email Anda",
      intro:
        "Terima kasih telah membuat akun TitipSandi. Verifikasi alamat email ini untuk mengaktifkan akun dan mulai menggunakan brankas Anda.",
      buttonLabel: "Verifikasi Email",
      url: verificationUrl,
      expiry: "selama 30 menit",
      securityNote: "Jika Anda tidak membuat akun TitipSandi, abaikan email ini.",
    }),
  });
}

export async function sendPasswordChangedEmail(
  to: string,
  input: { changedAt: Date; securityUrl: string },
) {
  const changedAt = new Intl.DateTimeFormat("id-ID", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(input.changedAt);

  return sendEmail({
    to,
    subject: "Password TitipSandi Anda telah diubah",
    text: [
      "Password akun TitipSandi Anda telah berhasil diubah.",
      `Waktu perubahan: ${changedAt} WIB`,
      "",
      "Semua sesi lama telah dicabut. Silakan masuk kembali menggunakan password baru Anda.",
      "",
      `Jika bukan Anda yang melakukan perubahan ini, segera amankan akun: ${input.securityUrl}`,
      "",
      "TitipSandi tidak akan pernah meminta password Anda melalui email.",
    ].join("\n"),
    html: renderSecurityNotificationEmail({
      preheader: "Password TitipSandi Anda telah berhasil diubah.",
      title: "Password berhasil diubah",
      intro:
        "Password akun Anda telah diperbarui. Semua sesi lama telah dicabut dan Anda perlu masuk kembali menggunakan password baru.",
      changedAt: `${changedAt} WIB`,
      securityUrl: input.securityUrl,
    }),
  });
}

export async function sendTrustedContactInvitationEmail(
  to: string,
  input: TrustedContactInvitationEmail,
) {
  const safeOwnerNameForSubject = input.ownerName.replace(/[\r\n]+/g, " ").trim();
  return sendEmail({
    to,
    subject: `${safeOwnerNameForSubject} menambahkan Anda sebagai kontak darurat • TitipSandi`,
    text: [
      `Halo ${input.contactName},`,
      "",
      `${input.ownerName} menambahkan Anda sebagai kontak darurat di TitipSandi dengan hubungan "${input.relation}".`,
      "",
      "Pemilik akun akan membagikan kode darurat melalui kanal terpisah yang aman.",
      "Jangan bagikan kode tersebut kepada siapa pun dan gunakan hanya saat benar-benar diperlukan.",
      "",
      `Halaman akses darurat: ${input.emergencyUrl}`,
      "",
      "TitipSandi tidak menyertakan kode darurat di email dan tidak akan pernah memintanya melalui email.",
    ].join("\n"),
    html: renderTrustedContactInvitationEmail(input),
  });
}

export async function sendLoginOtpEmail(to: string, code: string) {
  return sendEmail({
    to,
    subject: "Kode verifikasi login TitipSandi",
    text: [
      "Password Anda telah diverifikasi.",
      "",
      `Kode OTP login: ${code}`,
      "",
      "Kode berlaku selama 5 menit dan hanya dapat digunakan satu kali.",
      "Jika Anda tidak sedang login, jangan bagikan kode ini dan segera ubah password.",
    ].join("\n"),
    html: renderLoginOtpEmail({ code, expiresInMinutes: 5 }),
  });
}

async function sendEmail(input: { to: string; subject: string; text: string; html: string }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    throw new Error("RESEND_API_KEY dan EMAIL_FROM wajib diisi untuk mengirim email.");
  }

  emailLogoContentPromise ??= readFile(join(process.cwd(), "public", "icons", "icon-192.png")).then(
    (content) => content.toString("base64"),
  );

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: input.subject,
      text: input.text,
      html: input.html,
      attachments: [
        {
          content: await emailLogoContentPromise,
          filename: "titipsandi-icon.png",
          content_id: EMAIL_LOGO_CONTENT_ID,
          content_type: "image/png",
        },
      ],
    }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(`Pengiriman email gagal dengan status ${response.status}.`);
  }
}
