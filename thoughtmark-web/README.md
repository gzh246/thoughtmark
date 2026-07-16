# Thoughtmark Web

The web application provides authentication, bookmark capture and management, AI-assisted organization, search, knowledge-graph views, notifications, and sharing APIs.

## Local development

```bash
cp .env.example .env
npm ci
npx prisma generate
npx prisma migrate dev
npm run dev
```

Open `http://localhost:3000`.

## Checks

```bash
npx prisma generate
npx tsc --noEmit
npm run lint
```

Playwright API and end-to-end tests require PostgreSQL, Redis, and a running local application.

All configuration in this portfolio repository is synthetic or environment-driven. Never commit real credentials or deployment addresses.
