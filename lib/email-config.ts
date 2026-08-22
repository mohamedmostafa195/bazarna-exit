export type EmailProvider = "smtp" | "resend" | "brevo" | null;

function parseFromAddress(raw?: string | null) {
  if (!raw) return null;
  const match = raw.match(/<([^>]+)>/);
  return (match?.[1] ?? raw).trim();
}

export function getEmailProvider(): EmailProvider {
  const forced = process.env.EMAIL_PROVIDER?.toLowerCase();
  if (forced === "smtp" || forced === "resend" || forced === "brevo") {
    return forced;
  }
  if (process.env.SMTP_USER && process.env.SMTP_PASS) return "smtp";
  if (process.env.RESEND_API_KEY) return "resend";
  if (process.env.BREVO_API_KEY) return "brevo";
  return null;
}

export function getEmailSender() {
  const provider = getEmailProvider();
  const name =
    process.env.SMTP_FROM_NAME ||
    process.env.BREVO_SENDER_NAME ||
    "Bazarna Exit Queue";

  let email =
    process.env.SMTP_FROM_EMAIL ||
    process.env.BREVO_SENDER_EMAIL ||
    parseFromAddress(process.env.EMAIL_FROM) ||
    process.env.SMTP_USER ||
    "";

  if (provider === "smtp" && process.env.SMTP_USER) {
    email = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER;
  }

  return { name, email };
}

export function getReplyToEmail() {
  return (
    process.env.EMAIL_REPLY_TO ||
    process.env.SMTP_USER ||
    getEmailSender().email ||
    undefined
  );
}

export function isGmailSender(email: string) {
  const lower = email.toLowerCase();
  return lower.endsWith("@gmail.com") || lower.endsWith("@googlemail.com");
}

export function getEmailDeliverabilityWarning(): string | null {
  const provider = getEmailProvider();
  const { email } = getEmailSender();

  if (!provider) {
    return "No email provider configured.";
  }

  if (provider === "brevo" && email && isGmailSender(email)) {
    return (
      "Brevo is sending from a Gmail address — Gmail often marks these as spam. " +
      "Use Gmail SMTP (SMTP_USER/SMTP_PASS) or a verified domain with Resend/Brevo."
    );
  }

  if (provider === "resend") {
    const from = process.env.EMAIL_FROM ?? "";
    if (from.includes("onboarding@resend.dev")) {
      return "Resend test sender only delivers to your own email. Verify a domain in Resend.";
    }
  }

  return null;
}
