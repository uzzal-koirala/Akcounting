function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function inviteEmailShell({ eyebrow, heading, intro, name, link, buttonLabel, expiryNote, footerNote }: {
  eyebrow: string;
  heading: string;
  intro: string;
  name: string;
  link: string;
  buttonLabel: string;
  expiryNote: string;
  footerNote: string;
}) {
  const safeName = escapeHtml(name);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${heading}</title>
  </head>
  <body style="margin:0; padding:0; background-color:#f1f0f7; font-family:'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
    <span style="display:none; max-height:0; overflow:hidden; opacity:0;">${intro}</span>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f0f7; padding:40px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px; background-color:#ffffff; border-radius:20px; overflow:hidden; box-shadow:0 20px 60px rgba(76,29,149,0.12);">
            <tr>
              <td style="background-color:#4c1d95; background-image:linear-gradient(135deg,#4c1d95,#7c3aed); padding:40px 40px 36px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="width:44px;">
                      <table role="presentation" cellpadding="0" cellspacing="0" style="width:44px; height:44px; background-color:rgba(255,255,255,0.16); border-radius:12px;">
                        <tr><td align="center" valign="middle" style="font-size:20px;">🏦</td></tr>
                      </table>
                    </td>
                    <td style="padding-left:12px; vertical-align:middle;">
                      <p style="margin:0; color:#ffffff; font-size:15px; font-weight:700; line-height:1.2;">AKCounting</p>
                      <p style="margin:2px 0 0; color:#ddd6fe; font-size:9px; font-weight:600; letter-spacing:0.16em; text-transform:uppercase;">by Nepsus</p>
                    </td>
                  </tr>
                </table>
                <p style="margin:28px 0 0; color:#ddd6fe; font-size:11px; font-weight:700; letter-spacing:0.12em; text-transform:uppercase;">${escapeHtml(eyebrow)}</p>
                <h1 style="margin:10px 0 0; color:#ffffff; font-size:23px; line-height:1.35; font-weight:700;">${heading}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:36px 40px 8px;">
                <p style="margin:0; color:#1e293b; font-size:14px; line-height:1.6;">Hi ${safeName},</p>
                <p style="margin:14px 0 0; color:#475569; font-size:13.5px; line-height:1.65;">${intro}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:26px 40px 6px;" align="center">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="border-radius:10px; background-color:#6d28d9;">
                      <a href="${link}" style="display:inline-block; padding:14px 32px; font-size:13.5px; font-weight:700; color:#ffffff; text-decoration:none; border-radius:10px;">${buttonLabel} &rarr;</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 40px 0;" align="center">
                <p style="margin:0; color:#94a3b8; font-size:10.5px; line-height:1.6;">Button not working? Copy and paste this link:</p>
                <p style="margin:6px 0 0; word-break:break-all;"><a href="${link}" style="color:#7c3aed; font-size:10.5px; text-decoration:underline;">${link}</a></p>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 40px 0;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#faf9ff; border:1px solid #ede9fe; border-radius:12px;">
                  <tr>
                    <td style="padding:14px 18px; color:#6d28d9; font-size:11px; font-weight:600; line-height:1.5;">⏱️ ${escapeHtml(expiryNote)}</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:32px 40px 36px;">
                <hr style="border:none; border-top:1px solid #eef0f4; margin:0 0 20px;" />
                <p style="margin:0; color:#94a3b8; font-size:10px; text-align:center; line-height:1.6;">Sent by AKCounting &middot; Accounting made simple<br />${escapeHtml(footerNote)}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function adminInviteEmailHtml({ name, link, isResend }: { name: string; link: string; isResend?: boolean }) {
  return inviteEmailShell({
    eyebrow: "Super admin invite",
    heading: isResend ? "Your invite link was refreshed" : "You've been added as a super admin",
    intro: isResend
      ? "Here's a fresh link to set your password and sign in to AKCounting."
      : "You've been given super admin access to AKCounting. Set your password to activate your account and sign in.",
    name,
    link,
    buttonLabel: "Set your password",
    expiryNote: "This link expires in 48 hours. If you weren't expecting this invite, you can safely ignore this email.",
    footerNote: "You're receiving this because someone with super admin access added you to their organization.",
  });
}

export function verifyEmailHtml({ name, link }: { name: string; link: string }) {
  return inviteEmailShell({
    eyebrow: "Verify your email",
    heading: "Confirm your email address",
    intro: "Thanks for signing up for AKCounting! Please confirm this is your email address to activate your account and choose a plan.",
    name,
    link,
    buttonLabel: "Verify email address",
    expiryNote: "This link expires in 24 hours. If you didn't create an AKCounting account, you can safely ignore this email.",
    footerNote: "You're receiving this because this email address was used to sign up for AKCounting.",
  });
}

export function passwordResetEmailHtml({ name, link }: { name: string; link: string }) {
  return inviteEmailShell({
    eyebrow: "Password reset",
    heading: "Reset your password",
    intro: "We received a request to reset your AKCounting password. Click the button below to choose a new one.",
    name,
    link,
    buttonLabel: "Reset your password",
    expiryNote: "This link expires in 1 hour and can only be used once. If you didn't request this, you can safely ignore this email — your password will not change.",
    footerNote: "You're receiving this because a password reset was requested for your AKCounting account.",
  });
}

export function teamInviteEmailHtml({ name, link, businessName, roleLabel, isResend }: {
  name: string;
  link: string;
  businessName: string;
  roleLabel: string;
  isResend?: boolean;
}) {
  const safeBusiness = escapeHtml(businessName);
  return inviteEmailShell({
    eyebrow: "Workspace invite",
    heading: isResend ? "Your invite link was refreshed" : `You've been invited to ${safeBusiness}`,
    intro: isResend
      ? `Here's a fresh link to set your password and join ${safeBusiness} on AKCounting.`
      : `${safeBusiness} has added you to their AKCounting workspace as ${escapeHtml(roleLabel)}. Set your password to activate your account and sign in.`,
    name,
    link,
    buttonLabel: "Set your password",
    expiryNote: "This link expires in 48 hours. If you weren't expecting this invite, you can safely ignore this email.",
    footerNote: `You're receiving this because ${safeBusiness} added you to their workspace on AKCounting.`,
  });
}
