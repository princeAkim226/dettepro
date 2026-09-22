# Déploiement DettePro sur Coolify (VPS Contabo)

## Règles absolues

- Ne **jamais** toucher aux ressources Voltify, Supabase partagé (tables existantes), `raaga-bf.com`, volumes Docker existants.
- Créer une **ressource Coolify neuve** (projet séparé) pour DettePro.
- Créer une **base Postgres dédiée** `dettepro` + utilisateur dédié (pas la DB `postgres` Supabase / Voltify).
- Domaine : `dettepro.raaga-bf.com` — DNS à créer **chez Netlify** (pas Contabo).

## Avant de déployer

Sur le VPS :

```bash
free -h
df -h
docker stats --no-stream
```

Si la RAM est juste, ne pas ajouter un second stack lourd. Préférer une DB Coolify Postgres légère dédiée.

## DNS (Netlify)

Créer un enregistrement pour `dettepro.raaga-bf.com` pointant vers l’IP du VPS Contabo (A) ou le CNAME indiqué par Coolify.

## Base de données

Exemple (adapter host/port selon votre Postgres isolé) :

```sql
CREATE USER dettepro WITH PASSWORD 'MOT_DE_PASSE_FORT';
CREATE DATABASE dettepro OWNER dettepro;
GRANT ALL PRIVILEGES ON DATABASE dettepro TO dettepro;
```

`DATABASE_URL` :

```
postgresql://dettepro:MOT_DE_PASSE_FORT@HOST:5432/dettepro?schema=public
```

Puis migrations :

```bash
npx prisma migrate deploy
npm run db:seed
```

## Coolify

1. Nouveau projet / nouvelle application depuis ce dépôt.
2. Build : Dockerfile à la racine (contexte = racine du dépôt).
3. Domaine : `dettepro.raaga-bf.com` (TLS géré par Coolify/Traefik).
4. Variables d’environnement (production, **pas** Preview) — voir `.env.example`.
5. Port exposé : `3000`.

### Worker rappels (2ᵉ ressource)

Même image, commande :

```bash
npx tsx worker/reminders.ts
```

Ou :

```bash
node --import tsx worker/reminders.ts
```

Variables : mêmes que l’app (`DATABASE_URL`, WhatsApp, etc.).

## Variables obligatoires (fail-fast)

L’app / le worker refusent de démarrer si manquent :

- `DATABASE_URL`
- `AUTH_SECRET`
- `BETTER_AUTH_URL` (= `https://dettepro.raaga-bf.com`)
- `NEXT_PUBLIC_APP_URL` (= idem)

WhatsApp : laisser `WHATSAPP_DRY_RUN=true` jusqu’à configuration Meta.

## Sauvegarde

Le script nocturne actuel ne couvre que Supabase/Voltify. Ajouter un dump `dettepro`, par ex. :

```bash
# /usr/local/bin/sauvegarde-dettepro.sh
pg_dump "$DETTEPRO_DATABASE_URL" | gzip > "/var/backups/dettepro-$(date +%F).sql.gz"
# rétention 14 jours
```

Planifier via cron (hors volumes Voltify).

## Déploiement CI (optionnel)

```bash
curl -fsS -X POST \
  -H "Authorization: Bearer $COOLIFY_TOKEN" \
  "https://panel.raaga-bf.com/api/v1/deploy?uuid=<UUID_RESSOURCE_DETTEPRO>"
```

## Checklist go-live

- [ ] DNS Netlify OK
- [ ] DB dédiée créée
- [ ] `prisma migrate deploy` + seed admin
- [ ] Ressource Coolify app + worker
- [ ] Variables production (pas Preview)
- [ ] `WHATSAPP_DRY_RUN` puis credentials réels
- [ ] Script de sauvegarde étendu
- [ ] Test inscription boutiquier + dette + rappel dry-run
