import nodemailer from "nodemailer";

let cachedTransporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function getTransporter() {
  if (cachedTransporter) return cachedTransporter;

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? 465);
  const user = process.env.SMTP_USER;
  const password = process.env.SMTP_PASSWORD;
  if (!host || !user || !password) throw new Error("SMTP is not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASSWORD.");

  cachedTransporter = nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass: password } });
  return cachedTransporter;
}

export async function sendMail({ to, subject, html }: { to: string; subject: string; html: string }) {
  const transporter = getTransporter();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  await transporter.sendMail({ from, to, subject, html });
}
