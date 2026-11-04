# FaceDrop: photographer & guest web app

**Find yourself in every frame.** FaceDrop delivers event photos with face recognition. A photographer uploads the whole shoot, and each guest takes one selfie to get every photo they're in, with no scrolling through thousands of pictures.

This repo is the React front end. It serves two audiences:

- **Photographers** sign up, buy a plan, create events, upload galleries and share an event code with guests.
- **Guests** enter the event code, take or upload a selfie, and download the photos they appear in.

Designed and built by Siddh.

## Features

- **Accounts:** sign up, email verification, sign in, forgot and reset password
- **Events:** create, save as draft, edit and delete events; upload large galleries (including HEIC); share a guest code
- **Guest flow:** find an event by code, match a selfie, browse and download matched photos
- **Plans:** choose a package (photos per event and hours online), pay, and track remaining events
- **Languages:** English and Hindi (हिंदी) on guest-facing and plan pages

## Tech stack

| Area | Choice |
| --- | --- |
| Framework | React 18, TypeScript, Vite 5 |
| Styling | Tailwind CSS 3, shadcn/ui (Radix primitives) |
| Routing | React Router 6 |
| Forms | Formik + Yup |
| Data | Axios, TanStack Query, Socket.IO client |
| i18n | i18next / react-i18next |

## Getting started

Requires Node 20 (see `.nvmrc`).

```sh
npm install
cp .env.example .env   # then point VITE_API_URL at your API
npm run dev
```

| Variable | Purpose |
| --- | --- |
| `VITE_API_URL` | Base URL of the FaceDrop API, including `/api` |
| `VITE_APP_SOURCE` | Sent as the `app-source` header on every request |
| `VITE_SOCKET_URL` | Optional socket server for live upload previews (defaults to the API host) |
| `VITE_CURRENCY` | Currency label next to prices; must match what the payment gateway charges (default `QAR`) |

Other scripts: `npm run build`, `npm run preview`, `npm run lint`.

## Project structure

```
src/
  components/
    brand/        Logo, auth layout and other FaceDrop-specific pieces
    ui/           shadcn/ui primitives, restyled to the FaceDrop tokens
  contexts/       Auth and global loader providers
  i18n/           en.json, hi.json
  pages/
    Auth/         Sign in, sign up, password reset, email verification
    Profile/      Dashboard and profile
    Event/        Create, upload and manage events
    Subscription/ Plans, payment status, billing
    EndUser/      Guest flow: event code, selfie, results
  service/        API client and endpoint constants
```

## Design system

The brand and UI kit live in `/brand-design` at the workspace root. Tokens are HSL variables in `src/index.css`, exposed to Tailwind in `tailwind.config.ts`:

- **Ink** `#0B0B12` for text and dark surfaces
- **Iris** `#5B4BFF` for primary actions
- **Lime** `#C8F34A` reserved for "match found" and live states
- Type: Bricolage Grotesque (display), Inter (UI), JetBrains Mono (codes), Caveat (handwritten notes), Noto Sans Devanagari (Hindi)

The signature motif is the viewfinder bracket: it frames the logo, the selfie target and every matched photo.
