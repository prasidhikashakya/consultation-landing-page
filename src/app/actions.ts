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
  } catch {
    // Do not log form values, Google API responses, or credential-bearing errors.
    console.error("[lead-submission] Google Sheets save failed.");
    return {
      errors: {},
      values,
      formError: "We could not save your request. Please try again in a moment.",
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
