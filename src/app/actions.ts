"use server";

import { redirect } from "next/navigation";

export type FormState = {
  errors?: Record<string, string>;
  values?: Record<string, string>;
  formError?: string;
};

type Field = "fullName" | "email" | "whatsapp" | "businessName" | "website" | "message";

function clean(value: FormDataEntryValue | null, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function validOptionalUrl(value: string): boolean {
  if (!value) return true;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

export async function submitConsultation(_previous: FormState, data: FormData): Promise<FormState> {
  // Quietly discard automated submissions caught by the honeypot.
  if (clean(data.get("companyFax"), 200)) {
    return { formError: "We could not submit your request. Please try again." };
  }

  const values: Record<Field, string> = {
    fullName: clean(data.get("fullName"), 120),
    email: clean(data.get("email"), 254),
    whatsapp: clean(data.get("whatsapp"), 40),
    businessName: clean(data.get("businessName"), 160),
    website: clean(data.get("website"), 500),
    message: clean(data.get("message"), 3000),
  };
  const errors: Partial<Record<Field, string>> = {};
  if (!values.fullName) errors.fullName = "Please enter your full name.";
  if (!values.email) errors.email = "Please enter your email address.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) errors.email = "Enter a valid email address.";
  if (!values.whatsapp) errors.whatsapp = "Please enter your WhatsApp number.";
  else if (!/^[+\d][\d\s().-]{5,38}$/.test(values.whatsapp)) errors.whatsapp = "Enter a valid phone number.";
  if (!values.businessName) errors.businessName = "Please enter your business name.";
  if (!validOptionalUrl(values.website)) errors.website = "Enter a complete URL starting with http:// or https://.";
  if (Object.keys(errors).length) return { errors, values };

  const endpoint = process.env.LEAD_SUBMISSION_URL;
  if (!endpoint) {
    if (process.env.NODE_ENV === "development") redirect("/thank-you?demo=1");
    return {
      errors: {},
      values,
      formError: "The consultation form is not configured yet. Please contact us on WhatsApp instead.",
    };
  }

  let parsedEndpoint: URL;
  try {
    parsedEndpoint = new URL(endpoint);
    if (parsedEndpoint.protocol !== "https:" && process.env.NODE_ENV === "production") {
      return { errors: {}, values, formError: "The consultation form could not be submitted. Please try again later." };
    }
  } catch {
    return { errors: {}, values, formError: "The consultation form could not be submitted. Please try again later." };
  }

  try {
    const response = await fetch(parsedEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.LEAD_SUBMISSION_TOKEN
          ? { Authorization: `Bearer ${process.env.LEAD_SUBMISSION_TOKEN}` }
          : {}),
      },
      body: JSON.stringify(values),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error("Lead endpoint returned an unsuccessful status.");
  } catch {
    return { errors: {}, values, formError: "We could not submit your request. Please try again in a moment." };
  }

  redirect("/thank-you");
}
