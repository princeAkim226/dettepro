# DettePro

SaaS PWA pour boutiquiers (Burkina Faso) — suivi des crédits clients, totaux automatiques, rappels WhatsApp (texte + vocal), abonnement 2 000 FCFA/mois.

## Stack

Next.js 15 · Prisma · PostgreSQL · Better Auth · next-intl (FR / Dioula / Mooré) · PWA · Coolify

## Démarrage local

```bash
docker compose up -d
cp .env.example .env   # déjà fourni en local via .env
npm install
npx prisma migrate dev --name init
npm run db:seed
npm run dev
```

Worker rappels (terminal séparé) :

```bash
npm run worker
```

Ouvrir http://localhost:3000

Admin seed : téléphone `70000000` / mot de passe `admin123456` (voir `.env`).

## Déploiement

Voir [docs/DEPLOY.md](docs/DEPLOY.md) — domaine `dettepro.raaga-bf.com`, DB dédiée, Coolify, sans toucher Voltify.
