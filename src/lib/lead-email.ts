import "server-only";

import nodemailer, { type Transporter } from "nodemailer";
import type { LeadDetails } from "@/lib/google-sheets";

const senderAddress = process.env.SMTP_FROM || "mail@prasidhikashakya.com.np";
const notificationRecipient = process.env.LEAD_NOTIFICATION_TO || "prasidhikashakya@gmail.com";

function getTransporter(): Transporter | null {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT);
  const user = process.env.SMTP_USER;
  const password = process.env.SMTP_PASSWORD;
  if (!host || !Number.isInteger(port) || port < 1 || port > 65535 || !user || !password) return null;

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass: password },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  });
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    const replacements: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return replacements[char] ?? char;
  });
}

function leadRows(lead: LeadDetails, submittedAt: string): Array<[string, string]> {
  return [
    ["Full Name", lead.fullName],
    ["Active Email", lead.email],
    ["WhatsApp Number", lead.whatsapp],
    ["Business Name", lead.businessName],
    ["Website or Facebook URL", lead.website || "Not provided"],
    ["Main Marketing Need", lead.mainMarketingNeed],
    ["Anything You Want to Say", lead.message || "Not provided"],
    ["Submission Date", submittedAt],
  ];
}

function htmlLeadTable(lead: LeadDetails, submittedAt: string): string {
  const rows = leadRows(lead, submittedAt)
    .map(([label, value]) => `<tr><th style="padding:10px 12px;text-align:left;background:#f2f8fc;color:#00318e">${escapeHtml(label)}</th><td style="padding:10px 12px;border-bottom:1px solid #e4ebf2;white-space:pre-wrap">${escapeHtml(value)}</td></tr>`)
    .join("");
  return `<table role="presentation" style="width:100%;border-collapse:collapse;font:14px Arial,sans-serif;color:#171717">${rows}</table>`;
}

export function isLeadEmailConfigured(): boolean {
  return Boolean(getTransporter());
}

export async function sendLeadEmails(lead: LeadDetails, submittedAt: string): Promise<{
  clientConfirmation: "Sent" | "Failed";
  ownerNotification: "Sent" | "Failed";
}> {
  const transporter = getTransporter();
  if (!transporter) throw new Error("SMTP_NOT_CONFIGURED");

  const details = htmlLeadTable(lead, submittedAt);
  const textDetails = leadRows(lead, submittedAt).map(([label, value]) => `${label}: ${value}`).join("\n");
  const sender = { name: "Prasidhika Shakya", address: senderAddress };
  const safeNameForSubject = lead.fullName.replace(/[\r\n\0]/g, " ").slice(0, 120);

  const [clientResult, ownerResult] = await Promise.allSettled([
    transporter.sendMail({
      from: sender,
      to: lead.email,
      subject: "We received your digital marketing consultation request",
      text: `Hi ${lead.fullName},\n\nThank you for requesting a free digital marketing consultation. We have saved your request and will follow up about the next steps.\n\nPrasidhika Shakya`,
      html: `<div style="max-width:620px;margin:auto;padding:28px;font:15px/1.65 Arial,sans-serif;color:#263752"><h1 style="color:#00318e;font-size:24px">Thanks, ${escapeHtml(lead.fullName)}.</h1><p>We received your request for a free digital marketing consultation. We’ll follow up about the next steps.</p><p style="margin-top:28px;color:#596579">Prasidhika Shakya<br/>Digital Marketing Strategy</p></div>`,
    }),
    transporter.sendMail({
      from: sender,
      to: notificationRecipient,
      replyTo: lead.email,
      subject: `New consultation lead: ${safeNameForSubject}`,
      text: `A new consultation lead was saved to the Google Sheet.\n\n${textDetails}`,
      html: `<div style="max-width:760px;margin:auto;padding:28px;font:15px/1.55 Arial,sans-serif;color:#263752"><h1 style="margin:0 0 18px;color:#00318e;font-size:22px">New consultation lead</h1>${details}</div>`,
    }),
  ]);

  return {
    clientConfirmation: clientResult.status === "fulfilled" ? "Sent" : "Failed",
    ownerNotification: ownerResult.status === "fulfilled" ? "Sent" : "Failed",
  };
}
