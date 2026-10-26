"use server";

import { redirect } from "next/navigation";
import { randomUUID } from "node:crypto";
import { marketingNeeds, type MarketingNeed } from "@/lib/lead-fields";
import { saveLead, updateLeadEmailStatus, type LeadDetails } from "@/lib/google-sheets";
import { isLeadEmailConfigured, sendLeadEmails } from "@/lib/lead-email";

export type FormState = {
  errors?: Record<string, string>;
  values?: Record<string, string>;
  formError?: string;
};

type LeadField = "fullName" | "email" | "whatsapp" | "businessName" | "website" | "mainMarketingNeed" | "message";

const safeLeadErrorCodes = new Set([
  "LEAD_CONFIG_MISSING",
  "LEAD_CONFIG_INVALID",
  "LEAD_SHEET_TAB_MISSING",
  "LEAD_SHEET_HEADERS_MISMATCH",
  "LEAD_ROW_NOT_CONFIRMED",
]);

function getSafeLeadDiagnostic(error: unknown): string {
  if (error instanceof Error && safeLeadErrorCodes.has(error.message)) return error.message;
  if (error && typeof error === "object") {
    const details = error as { response?: { status?: unknown }; code?: unknown };
    if (typeof details.response?.status === "number") return `GOOGLE_SHEETS_HTTP_${details.response.status}`;
    if (typeof details.code === "string" && /^[a-z0-9_-]{1,32}$/i.test(details.code)) {
      return `GOOGLE_SHEETS_${details.code.toUpperCase()}`;
    }
  }
  return "UNKNOWN";
}

function getLeadSaveErrorMessage(diagnostic: string): string {
  if (diagnostic === "LEAD_CONFIG_MISSING") {
    return "The Google Sheets connection is missing from the live site. Check the two required Sheets variables in Vercel Production.";
  }
  if (diagnostic === "LEAD_CONFIG_INVALID" || diagnostic === "GOOGLE_SHEETS_HTTP_401") {
    return "Google could not authenticate the Sheets connection. Replace the service-account JSON in Vercel with a complete, valid key.";
  }
  if (diagnostic === "GOOGLE_SHEETS_HTTP_403") {
    return "Google denied access to the Sheet. Check that the Sheets API is enabled and the service account has Editor access.";
  }
  if (diagnostic === "GOOGLE_SHEETS_HTTP_404") {
    return "Google could not find the Sheet. Check the spreadsheet ID in Vercel.";
  }
  if (diagnostic === "LEAD_SHEET_TAB_MISSING") {
    return "The configured Sheet tab was not found. Remove GOOGLE_SHEETS_TAB_NAME or set it to the exact tab label at the bottom of your Sheet.";
  }
  if (diagnostic === "LEAD_SHEET_HEADERS_MISMATCH") {
    return "The selected Sheet tab already has different column headers. Choose a blank tab for consultation leads.";
  }
  if (diagnostic === "LEAD_ROW_NOT_CONFIRMED") {
    return "Google did not confirm that the lead was added. Please try again, and check the Sheet before submitting again.";
  }
  return "We could not save your request. Please check the Google Sheets connection and try again.";
}

function clean(value: FormDataEntryValue | null, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function validOptionalUrl(value: string): boolean {
  if (!value) return true;
  try {
    const parsed = new URL(value);
    return (parsed.protocol === "https:" || parsed.protocol === "http:") && Boolean(parsed.hostname);
  } catch {
    return false;
  }
}

function validSubmissionId(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function submitConsultation(_previous: FormState, data: FormData): Promise<FormState> {
  if (clean(data.get("companyFax"), 200)) {
    return { formError: "We could not submit your request. Please try again." };
  }

  const mainMarketingNeed = clean(data.get("mainMarketingNeed"), 100);
  const values: Record<LeadField, string> & { submissionId: string } = {
    fullName: clean(data.get("fullName"), 120),
    email: clean(data.get("email"), 254),
    whatsapp: clean(data.get("whatsapp"), 40),
    businessName: clean(data.get("businessName"), 160),
    website: clean(data.get("website"), 500),
    mainMarketingNeed,
    message: clean(data.get("message"), 3000),
    submissionId: clean(data.get("submissionId"), 64),
  };

  const errors: Partial<Record<LeadField, string>> = {};
  if (!values.fullName) errors.fullName = "Please enter your full name.";
  if (!values.email) errors.email = "Please enter your email address.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) errors.email = "Enter a valid email address.";
  if (!values.whatsapp) errors.whatsapp = "Please enter your WhatsApp number.";
  else if (!/^[+\d][\d\s().-]{5,38}$/.test(values.whatsapp)) errors.whatsapp = "Enter a valid phone number.";
  if (!values.businessName) errors.businessName = "Please enter your business name.";
  if (!validOptionalUrl(values.website)) errors.website = "Enter a complete URL starting with http:// or https://.";
  if (!values.mainMarketingNeed) errors.mainMarketingNeed = "Choose your main marketing need.";
  else if (!marketingNeeds.includes(values.mainMarketingNeed as MarketingNeed)) {
    errors.mainMarketingNeed = "Choose one of the listed marketing needs.";
  }
  if (Object.keys(errors).length) return { errors, values };
  if (!validSubmissionId(values.submissionId)) values.submissionId = randomUUID();

  const lead: LeadDetails = {
    fullName: values.fullName,
    email: values.email,
    whatsapp: values.whatsapp,
    businessName: values.businessName,
    website: values.website,
    mainMarketingNeed: values.mainMarketingNeed,
    message: values.message,
    submissionId: values.submissionId,
  };

  let saved: Awaited<ReturnType<typeof saveLead>>;
  let emailConfigured: boolean;
  try {
    emailConfigured = isLeadEmailConfigured();
    saved = await saveLead(lead, emailConfigured);
  } catch (error) {
    // Do not log form values, Google API responses, or credential-bearing errors.
    const diagnostic = getSafeLeadDiagnostic(error);
    console.error(`[lead-submission] Google Sheets save failed: ${diagnostic}.`);
    return {
      errors: {},
      values,
      formError: getLeadSaveErrorMessage(diagnostic),
    };
  }

  if (!saved.duplicate && emailConfigured) {
    let clientEmailStatus: "Sent" | "Failed" = "Failed";
    try {
      const emailResult = await sendLeadEmails(lead, saved.submittedAt);
      clientEmailStatus = emailResult.clientConfirmation;
      if (emailResult.ownerNotification === "Failed") {
        console.warn("[lead-submission] Owner notification email failed.");
      }
    } catch {
      console.warn("[lead-submission] Confirmation email could not be sent.");
    }

    try {
      await updateLeadEmailStatus(saved.rowNumber, clientEmailStatus);
    } catch {
      // The lead is already saved. Keep the successful submission and thank-you redirect.
      console.warn("[lead-submission] Email status could not be updated in the sheet.");
    }
  }

  redirect("/thank-you");
}
