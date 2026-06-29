import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

interface QueueConfirmationEmailParams {
  to: string;
  brandName: string;
  queueNumber: number;
  eventName: string;
  ticketUrl: string;
  qrCodeDataUrl?: string;
}

export async function sendQueueConfirmationEmail(
  params: QueueConfirmationEmailParams
): Promise<{ success: boolean; error?: string }> {
  const { to, brandName, queueNumber, eventName, ticketUrl, qrCodeDataUrl } =
    params;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #1a1a1a;">Bazarna Exit Queue</h1>
      <p>Hello <strong>${brandName}</strong>,</p>
      <p>Your exit number has been confirmed for <strong>${eventName}</strong>.</p>
      <div style="background: #f5f5f5; padding: 24px; border-radius: 8px; text-align: center; margin: 24px 0;">
        <p style="margin: 0; font-size: 14px; color: #666;">Your Exit Number</p>
        <p style="margin: 8px 0 0; font-size: 48px; font-weight: bold; color: #1a1a1a;">#${queueNumber}</p>
      </div>
      ${qrCodeDataUrl ? `<div style="text-align: center; margin: 24px 0;"><img src="${qrCodeDataUrl}" alt="QR Code" width="200" height="200" /></div>` : ""}
      <p><strong>Instructions:</strong></p>
      <ul>
        <li>Please wait until your number is called</li>
        <li>Keep this email or show your QR code at the exit</li>
        <li>Monitor the display screen for updates</li>
        <li>When your number is called, proceed to the exit area</li>
      </ul>
      <p><a href="${ticketUrl}" style="color: #2563eb;">View your ticket online</a></p>
      <p style="color: #666; font-size: 12px;">Bazarna Operations Team</p>
    </div>
  `;

  if (!resend) {
    console.log("[Email] RESEND_API_KEY not set. Would send to:", to);
    console.log("[Email] Queue #", queueNumber, "for", brandName);
    return { success: true };
  }

  try {
    await resend.emails.send({
      from: process.env.EMAIL_FROM ?? "Bazarna <onboarding@resend.dev>",
      to,
      subject: `Exit Queue #${queueNumber} - ${eventName}`,
      html,
    });
    return { success: true };
  } catch (error) {
    console.error("Failed to send email:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send email",
    };
  }
}
