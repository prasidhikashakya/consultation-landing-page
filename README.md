# Prasidhika Shakya — Digital Marketing Strategy

A responsive Next.js landing page and thank-you page for the free digital marketing consultation offer.

## Local setup

1. Install Node.js 20.9 or newer.
2. Run `npm install`.
3. Copy `.env.example` to `.env.local`.
4. The supplied logo and portrait are already included in `public/` and used by the pages.
5. Run `npm run dev` and open `http://localhost:3000`.

The form clearly labels development demo mode when no lead endpoint is configured. It validates details on the server but does not send or store them. A valid demo submission opens `/thank-you?demo=1`.

## Connect the production form

Configure `LEAD_SUBMISSION_URL` to a secure HTTPS endpoint you control or a form service endpoint that accepts a JSON `POST` with `fullName`, `email`, `whatsapp`, `businessName`, `website`, and `message`. The endpoint must validate and safely store/process the lead, apply its own rate limiting and spam controls, and return a `2xx` response only after it has accepted the submission. If authentication is needed, set `LEAD_SUBMISSION_TOKEN`; it is only read by the server. The app never reports a successful production submission unless this request returns `2xx`.

Set `NEXT_PUBLIC_FORM_LIVE=true` only after verifying that endpoint. In production, a missing backend does not redirect and the form reports that it is not configured. Keep credentials out of `NEXT_PUBLIC_*` variables.

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
