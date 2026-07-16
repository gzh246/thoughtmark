# Thoughtmark Browser Extension

A WXT and React browser extension for saving the current page to a Thoughtmark knowledge base. It captures the page URL and title, extracts readable text, supports notes and tags, and keeps a small offline queue when the API cannot be reached.

This directory contains the extension client only. A compatible Thoughtmark web API is required for authentication, bookmark storage, duplicate checks, and AI suggestions.

## Local development

Requirements: a current Node.js LTS release and npm.

1. Install dependencies:

   ```bash
   npm ci
   ```

2. Copy `.env.example` to `.env.local` and set the API endpoint when needed:

   ```env
   VITE_API_BASE_URL=http://127.0.0.1:3000/api
   ```

   The loopback URL above is also the built-in development fallback. Set an HTTPS endpoint for a deployed build. Environment variables are embedded at build time, so never put secrets in `VITE_*` values.

3. Start the development build:

   ```bash
   npm run dev
   ```

4. For a production bundle, run:

   ```bash
   npm run build
   ```

The popup accepts an API token and stores it in browser-local extension storage. Use a dedicated development account when testing.

## Checks

```bash
npm run compile
npm run build
```

No license has been selected for this repository.
