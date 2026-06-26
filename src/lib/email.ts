import nodemailer from "nodemailer";

export type SendEmailOptions = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

export function isEmailConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST?.trim() && process.env.SMTP_FROM?.trim());
}

function createTransport() {
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const secure = process.env.SMTP_SECURE === "true" || port === 465;

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure,
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
  });
}

export async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  if (!isEmailConfigured()) {
    console.info(
      `[Email] SMTP not configured — would send to ${options.to}\nSubject: ${options.subject}\n\n${options.text}`
    );
    return false;
  }

  const transport = createTransport();
  await transport.sendMail({
    from: process.env.SMTP_FROM,
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html,
  });

  return true;
}
