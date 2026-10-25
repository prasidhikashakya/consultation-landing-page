# Prasidhika Shakya — Digital Marketing Strategy

A responsive Next.js landing page and thank-you page for the free digital marketing consultation offer.

## Local setup

1. Install Node.js 20.9 or newer.
2. Run `npm install`.
3. Copy `.env.example` to `.env.local`.
4. The supplied logo and portrait are already included in `public/` and used by the pages.
5. Run `npm run dev` and open `http://localhost:3000`.

## Secure lead setup

The project has no existing Google or SMTP secrets configured. Credentials pasted into chat must be treated as exposed: revoke the posted Google service-account key and SMTP app password, then create replacements. Do not paste replacements into chat, source files, or any `NEXT_PUBLIC_*` variable.

### Google Sheets

1. Enable the Google Sheets API in the service account's Google Cloud project.
2. Share the target spreadsheet with the service account email as an Editor.
3. Add `GOOGLE_SHEETS_SPREADSHEET_ID` and the rotated service-account JSON as `GOOGLE_SERVICE_ACCOUNT_JSON` in Vercel. Keep the JSON in Vercel's encrypted server environment variables; do not commit a populated `.env.local`.
4. Optionally set `GOOGLE_SHEETS_TAB_NAME` to the existing tab name. When omitted, the first tab is used.

On the first accepted lead, an empty tab receives the headers, navy/cyan styling, frozen header row, filters, alternating row colors, date formatting, and column sizing. Existing data is preserved. A non-empty tab must already have the expected eleven visible headers in columns A–K; otherwise submissions fail safely instead of writing into mismatched columns. Column L is a hidden internal submission ID used to avoid duplicate rows after retries.

### Email

Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, and the rotated `SMTP_PASSWORD` in Vercel. `SMTP_FROM` defaults to `mail@prasidhikashakya.com.np`; confirm that the SMTP host authorizes this sender. `LEAD_NOTIFICATION_TO` defaults to `prasidhikashakya@gmail.com`. Vercel functions permit outbound SMTP except on port 25; messages are awaited before the successful response is returned. See [Vercel's SMTP guidance](https://vercel.com/kb/guide/serverless-functions-and-smtp).

The lead is saved to Sheets first. Then the app sends a client confirmation to the submitted email and a lead notification to the configured notification address. The client confirmation result is recorded as `Pending`, `Sent`, `Failed`, or `Not configured`. Email failure never removes the saved lead. If Sheets saving fails, the form shows an error and does not redirect to the Thank You page.

Set `NEXT_PUBLIC_FORM_LIVE=true` only after configuration is complete. Keep every credential server-side.

### Safe verification

- First configure a separate test spreadsheet tab or staging spreadsheet and an inbox you own. Do not use prospect details or send test mail to real prospects.
- Verify the seven visible form fields, server validation, single-choice marketing need, retry behavior, the saved row/statuses, both email destinations, and the Thank You redirect.
- Confirm a failed Sheets request leaves the visitor on the form with an error, and a mail failure leaves the row in place with `Initial Email Status` set to `Failed`.
- After verification, set the production spreadsheet and SMTP variables in Vercel. Do not deploy or switch the live flag until you approve it.

## Branding, video, and deployment

- Set `NEXT_PUBLIC_SITE_URL` to the production origin for canonical Open Graph metadata, for example `https://your-domain.com`.
- The centered logo is `/prasidhika-shakya-logo.png`; the landing-page portrait is `/prasidhika-shakya-portrait.png`.
- When ready, set `NEXT_PUBLIC_VIMEO_URL` to the Vimeo page URL. The app accepts Vimeo hosts only, extracts a numeric video ID, and renders a responsive player without autoplay. An unset or invalid value leaves the marked placeholder in place.
- The WhatsApp action uses `+9779848853856` and the supplied prefilled message.
- Deploy on Vercel by importing the project, adding the environment variables above, and deploying the production build.

## Project commands

- `npm run dev` — local development
- `npm run lint` — ESLint
- `npm run typecheck` — TypeScript check
- `npm run build` — production build
