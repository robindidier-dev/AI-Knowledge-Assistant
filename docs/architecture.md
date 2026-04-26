# Architecture du projet AI-Knowledge-Assistant

Document de référence technique décrivant les choix d'architecture, la structure du projet, et les décisions de conception.

---

## Vue d'ensemble

AI-Knowledge-Assistant est une application SaaS de type "chat with your documents" : les utilisateurs s'inscrivent, uploadent des documents, et interagissent avec un assistant IA entraîné sur leur contenu.

**Stack technique :**

| Couche             | Technologie           | Justification                                              |
| ------------------ | --------------------- | ---------------------------------------------------------- |
| Frontend           | React 18 + TypeScript | Standard de l'industrie, composants réutilisables          |
| Build frontend     | Vite                  | Démarrage instantané, remplace CRA                         |
| Styles             | TailwindCSS v4        | Utility-first, responsive intégré, bundle minimal          |
| State serveur      | TanStack Query        | Cache, revalidation, gestion loading/error                 |
| Backend            | NestJS + TypeScript   | Structuré, proche de Spring Boot, injection de dépendances |
| ORM                | Prisma 7              | Typesafe, migrations versionnées, client auto-généré       |
| Base de données    | PostgreSQL 16         | Relationnelle, robuste, open-source                        |
| Auth               | JWT + Passport.js     | Stateless, scalable, standard REST                         |
| IA                 | OpenAI GPT-4o         | API mature, streaming SSE                                  |
| Infrastructure dev | Docker Compose        | Reproductible, pas d'installation système                  |
| Package manager    | pnpm workspaces       | Monorepo, rapide, économe en disque                        |
| CI/CD              | GitHub Actions        | Intégré à GitHub, gratuit pour les projets publics         |

---

## Structure du monorepo

```
AI-Knowledge-Assistant/
├── .github/
│   └── workflows/
│       └── ci.yml              ← Pipeline CI (lint, build, tests)
├── apps/
│   ├── backend/                ← API NestJS
│   │   ├── prisma/
│   │   │   ├── migrations/     ← Fichiers SQL versionnés
│   │   │   ├── schema.prisma   ← Modèles de données
│   │   │   └── seed.ts         ← Données de test
│   │   ├── src/
│   │   │   ├── prisma/         ← Module Prisma global
│   │   │   ├── users/          ← Module Users (controller, service)
│   │   │   ├── auth/           ← Module Auth (phase 2)
│   │   │   ├── documents/      ← Module Documents (phase 3)
│   │   │   ├── conversations/  ← Module Conversations (phase 3)
│   │   │   ├── app.module.ts   ← Module racine NestJS
│   │   │   └── main.ts         ← Point d'entrée
│   │   ├── prisma.config.ts    ← Configuration Prisma CLI
│   │   ├── .env                ← Variables locales (non commité)
│   │   └── .env.example        ← Template variables (commité)
│   └── frontend/               ← Application React
│       ├── src/
│       │   ├── components/     ← Composants réutilisables
│       │   ├── pages/          ← Pages de l'application
│       │   ├── hooks/          ← Custom hooks React
│       │   ├── api/            ← Fonctions d'appel API
│       │   └── main.tsx        ← Point d'entrée React
│       └── index.html
├── .gitignore
├── .nvmrc                      ← Version Node.js du projet
├── .prettierrc                 ← Config formatage
├── docker-compose.yml          ← Services de développement
├── package.json                ← Scripts et dépendances racine
├── pnpm-workspace.yaml         ← Déclaration des apps
└── README.md
```

---

## Architecture backend

### Flux d'une requête HTTP

```
Requête HTTP
    ↓
Guard (JwtAuthGuard)       ← Vérifie le token JWT
    ↓
Pipe (ValidationPipe)      ← Valide et transforme le body
    ↓
Controller                 ← Route la requête vers le bon service
    ↓
Service                    ← Applique la logique métier
    ↓
PrismaService              ← Exécute la requête en base
    ↓
PostgreSQL
    ↓
Réponse JSON
```

### Modules NestJS

Chaque fonctionnalité est encapsulée dans un module indépendant :

```
AppModule (racine)
├── PrismaModule (@Global)     ← Connexion BDD, disponible partout
├── UsersModule                ← CRUD utilisateurs
├── AuthModule                 ← Login, register, JWT
├── DocumentsModule            ← Upload et gestion des documents
└── ConversationsModule        ← Chat avec l'IA
```

`@Global()` sur `PrismaModule` signifie que `PrismaService` est injecté sans import explicite dans les autres modules.

### Conventions de nommage

| Élément     | Convention      | Exemple               |
| ----------- | --------------- | --------------------- |
| Fichiers    | kebab-case      | `users.service.ts`    |
| Classes     | PascalCase      | `UsersService`        |
| Méthodes    | camelCase       | `findAll()`           |
| Variables   | camelCase       | `userId`              |
| Constantes  | SCREAMING_SNAKE | `JWT_SECRET`          |
| Routes HTTP | kebab-case      | `/api/user-documents` |

---

## Schéma de base de données

### Modèles (phase 1 → phase finale)

```
User
├── id          UUID (PK)
├── email       String (unique)
├── password    String (hashé bcrypt)
├── createdAt   DateTime
├── updatedAt   DateTime
├── documents   Document[]
└── conversations Conversation[]

Document
├── id          UUID (PK)
├── title       String
├── filename    String
├── storageKey  String       ← Clé S3 ou chemin local
├── mimeType    String
├── userId      UUID (FK)
├── createdAt   DateTime
└── chunks      DocumentChunk[]

DocumentChunk
├── id          UUID (PK)
├── content     String       ← Portion du document
├── embedding   Float[]      ← Vecteur pour la recherche sémantique
├── documentId  UUID (FK)
└── index       Int

Conversation
├── id          UUID (PK)
├── title       String
├── userId      UUID (FK)
├── createdAt   DateTime
└── messages    Message[]

Message
├── id          UUID (PK)
├── role        Enum (user | assistant)
├── content     String
├── conversationId UUID (FK)
└── createdAt   DateTime
```

### Règles de migration

- Une migration = un changement logique (pas un dump complet)
- Jamais de `prisma migrate dev` en production — toujours `prisma migrate deploy`
- Toujours relire le SQL généré avant d'appliquer une migration
- En cas de renommage de colonne : deux migrations (ajout + suppression) pour éviter la perte de données

---

## Authentification

### Flux de login

```
POST /auth/login { email, password }
    ↓
AuthService.login()
    ↓
Vérifie email en BDD
    ↓
bcrypt.compare(password, hash)
    ↓
jwt.sign({ sub: userId, email })
    ↓
{ accessToken, refreshToken }
```

### Flux de requête authentifiée

```
GET /documents
Authorization: Bearer <accessToken>
    ↓
JwtAuthGuard
    ↓
jwt.verify(token, JWT_SECRET)     ← Pas de requête BDD
    ↓
Injecte req.user = { userId, email }
    ↓
Controller → Service → Prisma
```

### Sécurité

- Mots de passe hachés avec **bcrypt** (coût 12) — jamais en clair
- Access token : durée courte (15 minutes)
- Refresh token : durée longue (7 jours), stocké en base pour révocation
- Variables sensibles : uniquement dans `.env`, jamais dans le code

---

## Environnements

| Variable       | Développement             | Production                       |
| -------------- | ------------------------- | -------------------------------- |
| `DATABASE_URL` | PostgreSQL local (Docker) | Instance managée (Railway, RDS…) |
| `JWT_SECRET`   | Chaîne de dev             | Secret long aléatoire            |
| `PORT`         | 3000                      | Défini par l'hébergeur           |
| `NODE_ENV`     | `development`             | `production`                     |

---

## Pipeline CI

Déclenché sur chaque push vers `main` ou `develop`, et sur chaque Pull Request :

```
1. Checkout du code
2. Installation de pnpm
3. Installation de Node.js (version depuis .nvmrc)
4. pnpm install --frozen-lockfile
5. prisma generate            ← Génère les types Prisma
6. pnpm lint                  ← ESLint sur tout le projet
7. pnpm build (backend)       ← Compilation TypeScript
8. pnpm build (frontend)      ← Build Vite
```

### Règles de branche

- `main` — production, protégée, merge uniquement via PR
- `develop` — intégration, merge des features avant release
- `feat/nom-feature` — branche de travail, courte durée de vie
- `fix/nom-bug` — correction de bug

Workflow quotidien :

```bash
git checkout -b feat/ma-feature
# ... développement ...
git push origin feat/ma-feature
# Ouvrir une Pull Request → CI doit être verte → merge
```

---

## Décisions de conception notables

### Pourquoi NestJS plutôt qu'Express ?

Express est plus répandu mais non-opinionated — chaque projet invente sa propre structure. NestJS impose des conventions (modules, injection de dépendances) qui correspondent exactement aux bonnes pratiques qu'on voulait apprendre. La courbe d'apprentissage est plus raide, la qualité architecturale est meilleure.

### Pourquoi Prisma plutôt que TypeORM ?

TypeORM est plus proche de Hibernate (décorateurs sur les entités) mais souffre de problèmes de typage et de maintenance. Prisma a un schéma déclaratif séparé du code applicatif, un client entièrement typé, et une meilleure expérience développeur. C'est le choix dominant dans les nouveaux projets Node.js en 2025.

### Pourquoi pnpm plutôt que npm ?

Vitesse d'installation, économie d'espace disque, et surtout le support natif des workspaces pour les monorepos. npm workspaces existe mais est moins mature. Yarn est une alternative viable mais pnpm est devenu le standard de facto.

### Pourquoi UUID plutôt qu'auto-increment pour les IDs ?

Les IDs auto-incrémentés (`1`, `2`, `3`…) sont devinables — un attaquant peut itérer `/users/1`, `/users/2`, etc. Les UUID sont non-devinables. De plus, les UUID peuvent être générés côté client sans coordination avec le serveur, ce qui facilite les architectures distribuées.
