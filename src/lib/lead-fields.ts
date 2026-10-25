export const marketingNeeds = [
  "Generate more leads",
  "Increase sales and revenue",
  "Improve social media marketing",
  "SEO and website traffic",
  "AI marketing automation",
  "Complete digital marketing strategy",
] as const;

export type MarketingNeed = (typeof marketingNeeds)[number];

export const leadSheetHeaders = [
  "Full Name",
  "Active Email",
  "WhatsApp Number",
  "Business Name",
  "Website or Facebook URL",
  "Main Marketing Need",
  "Anything You Want to Say",
  "Submission Date",
  "Lead Status",
  "Initial Email Status",
  "Calendly Booking Status",
  "Internal Submission ID",
] as const;
