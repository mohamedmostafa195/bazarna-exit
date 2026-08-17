import { Resend } from "resend";
import nodemailer from "nodemailer";

function getResend() {
  const apiKey = process.env.RESEND_API_KEY;
  return apiKey ? new Resend(apiKey) : null;
}

interface GenericEmailParams {
  to: string;
  toName?: string;
  subject: string;
  html: string;
}

async function sendViaSmtp(
  params: GenericEmailParams
): Promise<{ success: boolean; error?: string }> {
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = parseInt(process.env.SMTP_PORT || "465", 10);
  const secure = port === 465;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    return { success: false, error: "SMTP credentials not configured" };
  }

  const senderName =
    process.env.SMTP_FROM_NAME ||
    process.env.BREVO_SENDER_NAME ||
    "Bazarna Exit Queue";
  const senderEmail = process.env.SMTP_FROM_EMAIL || user;

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });

    await transporter.sendMail({
      from: `"${senderName}" <${senderEmail}>`,
      to: params.to,
      subject: params.subject,
      html: params.html,
    });

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

  const senderEmail =
    process.env.BREVO_SENDER_EMAIL ||
    process.env.EMAIL_FROM?.match(/<([^>]+)>/)?.[1] ||
    "mohameddmostafaa19@gmail.com";
  const senderName = process.env.BREVO_SENDER_NAME || "Bazarna Exit Queue";

  // 1. If key is an SMTP key (starts with "xsmtpsib-")
  if (apiKey.startsWith("xsmtpsib-")) {
    try {
      const transporter = nodemailer.createTransport({
        host: "smtp-relay.brevo.com",
        port: 587,
        secure: false,
        auth: {
          user: senderEmail,
          pass: apiKey,
        },
      });

      await transporter.sendMail({
        from: `"${senderName}" <${senderEmail}>`,
        to: params.to,
        subject: params.subject,
        html: params.html,
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

  // 2. Otherwise use Brevo REST API (for "xkeysib-" API keys)
  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: {
          name: senderName,
          email: senderEmail,
        },
        to: [
          {
            email: params.to,
            name: params.toName || params.to,
          },
        ],
        subject: params.subject,
        htmlContent: params.html,
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

    const data = (await response.json().catch(() => ({}))) as {
      messageId?: string;
    };
    console.log(
      `[Brevo REST Success] Email dispatched to ${params.to} (MessageId: ${data.messageId ?? "N/A"})`
    );
    return { success: true };
  } catch (error) {
    console.error("[Brevo Exception]", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to send email via Brevo",
    };
  }
}

async function sendEmail(
  params: GenericEmailParams
): Promise<{ success: boolean; error?: string }> {
  // 1. Check direct SMTP (e.g. Gmail SMTP)
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    return sendViaSmtp(params);
  }

  // 2. Check Brevo
  if (process.env.BREVO_API_KEY) {
    return sendViaBrevo(params);
  }

  // 3. Fallback to Resend if configured
  const resend = getResend();
  if (resend) {
    try {
      await resend.emails.send({
        from: process.env.EMAIL_FROM ?? "Bazarna <onboarding@resend.dev>",
        to: params.to,
        subject: params.subject,
        html: params.html,
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

  // 4. Dev Fallback
  console.log("[Email] No email provider configured. Would send to:", params.to);
  console.log("[Email] Subject:", params.subject);
  return { success: true };
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
      <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 28px 0;" />
      <p style="color: #a1a1aa; font-size: 12px;">Bazarna Operations Team</p>
    </div>
  `;

  return sendEmail({
    to,
    toName: brandName,
    subject: `${entranceLabel} Exit #${queueNumber} - ${eventName}`,
    html,
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

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1a1a1a;">
      <h1 style="color: #ea580c; margin-bottom: 8px;">Bazarna Exit Queue</h1>
      <h2 style="color: #1a1a1a; margin-top: 0;">Password Reset Request</h2>
      <p>Hello <strong>${brandName}</strong>,</p>
      <p>We received a request to reset your password for your Bazarna Exit Queue account.</p>
      <p>Click the button below to choose a new password. This link is valid for <strong>1 hour</strong> and can only be used once.</p>
      
      <div style="text-align: center; margin: 32px 0;">
        <a href="${resetUrl}" style="background-color: #ea580c; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 16px;">
          Reset My Password
        </a>
      </div>
      
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 28px 0;" />
      <p style="color: #666; font-size: 12px;">If you did not request this password reset, please ignore this email. Your password will remain unchanged.</p>
      <p style="color: #999; font-size: 12px; margin-top: 16px;">Bazarna Operations Team</p>
    </div>
  `;

  return sendEmail({
    to,
    toName: brandName,
    subject: "Reset your Bazarna Exit Queue password",
    html,
  });
}
