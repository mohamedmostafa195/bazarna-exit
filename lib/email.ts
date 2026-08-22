import { Resend } from "resend";
import nodemailer from "nodemailer";
import {
  getEmailDeliverabilityWarning,
  getEmailProvider,
  getEmailSender,
  getReplyToEmail,
  isGmailSender,
} from "@/lib/email-config";
import { getAppBaseUrl } from "@/lib/app-url";

interface GenericEmailParams {
  to: string;
  toName?: string;
  subject: string;
  html: string;
  text?: string;
}

function htmlToPlainText(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function buildMailOptions(params: GenericEmailParams) {
  const { name, email } = getEmailSender();
  const replyTo = getReplyToEmail();
  const text = params.text ?? htmlToPlainText(params.html);

  return {
    from: `"${name}" <${email}>`,
    to: params.to,
    subject: params.subject,
    html: params.html,
    text,
    replyTo,
    headers: {
      "X-Mailer": "Bazarna Exit Queue",
      "X-Entity-Ref-ID": `bazarna-${Date.now()}`,
    },
  };
}

async function sendViaSmtp(
  params: GenericEmailParams
): Promise<{ success: boolean; error?: string }> {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    return { success: false, error: "SMTP credentials not configured" };
  }

  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = parseInt(process.env.SMTP_PORT || "465", 10);
  const secure = port === 465;
  const mail = buildMailOptions(params);

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });

    await transporter.sendMail(mail);
    return { success: true };
  } catch (error) {
    console.error("[SMTP Error]", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send email via SMTP",
    };
  }
}

async function sendViaBrevo(
  params: GenericEmailParams
): Promise<{ success: boolean; error?: string }> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) return { success: false, error: "BREVO_API_KEY not set" };

  const { name, email: senderEmail } = getEmailSender();
  if (!senderEmail) {
    return { success: false, error: "BREVO_SENDER_EMAIL not set" };
  }

  if (isGmailSender(senderEmail)) {
    console.warn(
      "[Email] Brevo + @gmail.com sender → high spam risk. Switch to SMTP_USER/SMTP_PASS or a custom domain."
    );
  }

  const text = params.text ?? htmlToPlainText(params.html);
  const replyTo = getReplyToEmail();
  const smtpLogin =
    process.env.BREVO_SMTP_LOGIN || process.env.SMTP_USER || senderEmail;

  if (apiKey.startsWith("xsmtpsib-")) {
    try {
      const transporter = nodemailer.createTransport({
        host: "smtp-relay.brevo.com",
        port: 587,
        secure: false,
        auth: { user: smtpLogin, pass: apiKey },
      });

      await transporter.sendMail({
        ...buildMailOptions(params),
        from: `"${name}" <${senderEmail}>`,
      });
      return { success: true };
    } catch (error) {
      console.error("[Brevo SMTP Error]", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to send email via Brevo SMTP",
      };
    }
  }

  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: { name, email: senderEmail },
        to: [{ email: params.to, name: params.toName || params.to }],
        subject: params.subject,
        htmlContent: params.html,
        textContent: text,
        replyTo: replyTo ? { email: replyTo, name } : undefined,
        headers: {
          "X-Mailer": "Bazarna Exit Queue",
        },
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      console.error("[Brevo REST Error]", err);
      return {
        success: false,
        error:
          (err as { message?: string }).message ||
          `Brevo HTTP ${response.status}`,
      };
    }

    return { success: true };
  } catch (error) {
    console.error("[Brevo Exception]", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to send email via Brevo",
    };
  }
}

async function sendViaResend(
  params: GenericEmailParams
): Promise<{ success: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { success: false, error: "RESEND_API_KEY not set" };

  const from =
    process.env.EMAIL_FROM ||
    `"${getEmailSender().name}" <${getEmailSender().email}>`;
  const replyTo = getReplyToEmail();

  try {
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text ?? htmlToPlainText(params.html),
      replyTo,
    });
    return { success: true };
  } catch (error) {
    console.error("[Resend Error]", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to send email via Resend",
    };
  }
}

async function sendEmail(
  params: GenericEmailParams
): Promise<{ success: boolean; error?: string }> {
  const warning = getEmailDeliverabilityWarning();
  if (warning) console.warn(`[Email] ${warning}`);

  const provider = getEmailProvider();

  if (provider === "smtp") return sendViaSmtp(params);
  if (provider === "resend") return sendViaResend(params);
  if (provider === "brevo") return sendViaBrevo(params);

  console.error(
    "[Email] No email provider configured. Set SMTP_USER/SMTP_PASS or RESEND_API_KEY."
  );
  return { success: false, error: "Email provider not configured" };
}

interface QueueConfirmationEmailParams {
  to: string;
  brandName: string;
  queueNumber: number;
  eventName: string;
  entranceLabel: string;
  ticketUrl: string;
  qrCodeDataUrl?: string;
}

export async function sendQueueConfirmationEmail(
  params: QueueConfirmationEmailParams
): Promise<{ success: boolean; error?: string }> {
  const {
    to,
    brandName,
    queueNumber,
    eventName,
    entranceLabel,
    ticketUrl,
    qrCodeDataUrl,
  } = params;

  const appUrl = getAppBaseUrl();

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1a1a1a;">
      <h1 style="color: #ea580c; margin-bottom: 8px;">${entranceLabel} Exit Queue</h1>
      <p>Hello <strong>${brandName}</strong>,</p>
      <p>Your <strong>${entranceLabel}</strong> exit number for <strong>${eventName}</strong> is confirmed.</p>
      <p style="color: #666; font-size: 13px;">This number is only for the ${entranceLabel} exit. Bazarna and Byouth use separate queues.</p>
      <div style="background: #f4f4f5; padding: 24px; border-radius: 12px; text-align: center; margin: 24px 0;">
        <p style="margin: 0; font-size: 14px; color: #71717a;">${entranceLabel} Exit Number</p>
        <p style="margin: 8px 0 0; font-size: 48px; font-weight: bold; color: #ea580c;">#${queueNumber}</p>
      </div>
      ${
        qrCodeDataUrl
          ? `<div style="text-align: center; margin: 24px 0;"><img src="${qrCodeDataUrl}" alt="QR Code" width="200" height="200" style="border-radius: 8px; border: 1px solid #e4e4e7;" /></div>`
          : ""
      }
      <p><strong>Instructions:</strong></p>
      <ul style="color: #3f3f46; line-height: 1.6;">
        <li>Please wait until your number is called</li>
        <li>Keep this email or show your QR code at the exit</li>
        <li>Monitor the display screen for updates</li>
        <li>When your number is called, proceed to the exit area</li>
      </ul>
      <p style="margin-top: 24px;"><a href="${ticketUrl}" style="background-color: #ea580c; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">View Ticket Online</a></p>
      <p style="color: #666; font-size: 13px; word-break: break-all;">Or open: ${ticketUrl}</p>
      <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 28px 0;" />
      <p style="color: #a1a1aa; font-size: 12px;">Bazarna Exit Queue · ${appUrl}</p>
    </div>
  `;

  const text = `Hello ${brandName},

Your ${entranceLabel} exit number for ${eventName} is #${queueNumber}.

View your ticket: ${ticketUrl}

Bazarna Exit Queue
${appUrl}`;

  return sendEmail({
    to,
    toName: brandName,
    subject: `${entranceLabel} exit number #${queueNumber}`,
    html,
    text,
  });
}

interface PasswordResetEmailParams {
  to: string;
  brandName: string;
  resetUrl: string;
}

export async function sendPasswordResetEmail(
  params: PasswordResetEmailParams
): Promise<{ success: boolean; error?: string }> {
  const { to, brandName, resetUrl } = params;
  const appUrl = getAppBaseUrl();

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1a1a1a;">
      <h1 style="color: #ea580c; margin-bottom: 8px;">Bazarna Exit Queue</h1>
      <h2 style="color: #1a1a1a; margin-top: 0;">Password Reset</h2>
      <p>Hello <strong>${brandName}</strong>,</p>
      <p>We received a request to reset your password. This link is valid for <strong>1 hour</strong>.</p>
      
      <div style="text-align: center; margin: 32px 0;">
        <a href="${resetUrl}" style="background-color: #ea580c; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 16px;">
          Reset My Password
        </a>
      </div>

      <p style="color: #666; font-size: 13px; word-break: break-all;">
        Or copy this link: ${resetUrl}
      </p>
      
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 28px 0;" />
      <p style="color: #666; font-size: 12px;">If you did not request this, ignore this email.</p>
      <p style="color: #999; font-size: 12px; margin-top: 16px;">Bazarna Exit Queue · ${appUrl}</p>
    </div>
  `;

  const text = `Hello ${brandName},

Reset your Bazarna Exit Queue password:
${resetUrl}

This link expires in 1 hour. If you did not request this, ignore this email.

Bazarna Exit Queue
${appUrl}`;

  return sendEmail({
    to,
    toName: brandName,
    subject: "Reset your Bazarna Exit Queue password",
    html,
    text,
  });
}

export { getEmailProvider, getEmailDeliverabilityWarning } from "@/lib/email-config";
