# Glossaire technique — Développement web fullstack

Définitions des concepts rencontrés dans le projet AI_Knowledge_Assistant, rédigées pour un développeur qui débute en web.

---

## Architecture et organisation

### Monorepo

Un dépôt Git unique qui contient plusieurs applications ou packages distincts. Dans AI-Knowledge-Assistant : `apps/frontend` et `apps/backend` cohabitent dans le même repo.

**Avantages** : partage de code simplifié, CI unifiée, cohérence des versions, refactoring atomique (un seul commit peut modifier frontend et backend).

**Inconvénients** : le repo grossit, la CI peut devenir lente si mal configurée.

**Outils associés** : pnpm workspaces, Turborepo, Nx.

**Opposé** : polyrepo — un dépôt par application.

### Architecture trois couches (3-tier)

Séparation du code en trois responsabilités distinctes :

1. **Controller** — reçoit les requêtes HTTP, valide le format des données, appelle le service, renvoie la réponse. Ne contient aucune logique métier.
2. **Service** — contient toute la logique métier (règles, calculs, orchestration). Ne sait pas qu'il est appelé depuis HTTP.
3. **Repository** — seule couche qui parle à la base de données. Dans notre cas, `PrismaService` joue ce rôle.

Cette séparation permet de tester chaque couche indépendamment et de changer une implémentation sans toucher aux autres.

### Stateless vs Stateful

Un serveur **stateless** (sans état) ne mémorise rien entre deux requêtes. Chaque requête contient toutes les informations nécessaires à son traitement. C'est le modèle REST + JWT : le token dans l'en-tête HTTP suffit à identifier l'utilisateur, sans session stockée côté serveur.

Un serveur **stateful** maintient une session en mémoire pour chaque utilisateur connecté. Plus simple à implémenter, mais difficile à scaler horizontalement (si tu ajoutes un second serveur, lequel a la session ?).

---

## Outils de développement

### Node.js

Runtime JavaScript côté serveur. Permet d'exécuter du JavaScript (et TypeScript) en dehors d'un navigateur. Analogue à la JVM pour Java, mais basé sur un modèle **event loop** non-bloquant plutôt que sur des threads.

Conséquence pratique : Node.js gère des milliers de connexions simultanées avec un seul processus, car il ne bloque pas en attendant les réponses I/O (base de données, réseau). Tout est asynchrone par défaut — d'où l'omniprésence de `async/await`.

### TypeScript

Surcouche typée de JavaScript. TypeScript est un langage de développement — il est **transpilé** en JavaScript avant d'être exécuté. Le compilateur TypeScript (`tsc`) vérifie les types à la compilation et signale les erreurs avant que le code tourne.

Bénéfice principal : l'autocomplétion et la détection d'erreurs dans l'éditeur — une méthode qui attend un `string` et reçoit un `number` est détectée immédiatement, pas à l'exécution.

### pnpm

Package manager Node.js alternatif à npm. Stocke les packages une seule fois sur le disque et crée des liens symboliques — installation plus rapide, moins d'espace disque. Support natif des **workspaces** (monorepos).

La commande `pnpm --filter backend dev` exécute le script `dev` uniquement dans le package `backend`, sans lancer le frontend.

### Docker et Docker Compose

**Docker** est un outil de conteneurisation. Un conteneur est un processus isolé qui embarque tout ce dont il a besoin pour tourner (système, dépendances, configuration). Un conteneur PostgreSQL tourne identiquement sur Ubuntu, macOS ou Windows.

**Docker Compose** orchestre plusieurs conteneurs. Le fichier `docker-compose.yml` décrit les services (base de données, cache Redis, etc.) et leurs relations. `docker compose up -d` démarre tout en arrière-plan.

En développement, Docker remplace l'installation locale de PostgreSQL — pas de configuration système, pas de conflits de versions.

### ESLint

Analyseur statique de code (linter). Parcourt le code source sans l'exécuter et signale les violations de règles configurées : variables non utilisées, fonctions async sans `await`, types non sûrs, etc. Peut corriger automatiquement certaines erreurs avec `--fix`.

### Prettier

Formateur de code automatique. Contrairement à ESLint qui analyse la logique, Prettier ne s'occupe que de la mise en forme : indentation, guillemets, virgules, longueur des lignes. L'idée est d'éliminer tout débat de style dans une équipe — Prettier décide, tout le monde s'y plie.

### Husky

Outil qui intercepte les événements Git (commit, push) pour exécuter des scripts. Le hook `pre-commit` lance lint-staged avant chaque commit — si une erreur est détectée, le commit est annulé.

---

## Backend

### NestJS

Framework backend Node.js opinionated (il impose une structure). Inspiré d'Angular et de Spring Boot : modules, contrôleurs, services, injection de dépendances, décorateurs.

Comparaison avec Spring Boot :

| Spring Boot       | NestJS                     |
| ----------------- | -------------------------- |
| `@RestController` | `@Controller`              |
| `@Autowired`      | Injection par constructeur |
| `@GetMapping`     | `@Get`                     |
| `@Service`        | `@Injectable`              |
| `@PostConstruct`  | `OnModuleInit`             |

### ORM (Object-Relational Mapping)

Couche d'abstraction entre le code objet et la base de données relationnelle. Un ORM traduit les opérations sur des objets TypeScript en requêtes SQL.

Sans ORM : `SELECT id, email FROM users WHERE id = $1`
Avec Prisma : `prisma.user.findUnique({ where: { id } })`

L'ORM gère aussi les **migrations** — les scripts SQL versionnés qui font évoluer le schéma de la base de données.

### Prisma

ORM moderne pour Node.js/TypeScript. Trois composants :

- **Prisma Schema** (`schema.prisma`) : définition déclarative des modèles de données
- **Prisma Migrate** : génération et exécution des migrations SQL
- **Prisma Client** : client TypeScript auto-généré et entièrement typé

Particularité de Prisma 7 : la connexion à la base passe par un **adapter** explicite (`PrismaPg` pour PostgreSQL), séparant la configuration du CLI (dans `prisma.config.ts`) de la configuration du client applicatif.

### Migration de base de données

Script SQL versionné qui décrit une modification du schéma. Chaque migration est horodatée et stockée dans `prisma/migrations/`. Prisma maintient un historique en base (`_prisma_migrations`) pour savoir quelles migrations ont déjà été appliquées.

```
prisma migrate dev   → génère + applique la migration en développement
prisma migrate deploy → applique les migrations en production (sans génération)
```

### JWT (JSON Web Token)

Format de token d'authentification composé de trois parties encodées en base64 séparées par des points :

```
header.payload.signature
```

- **Header** : algorithme de signature (ex: HS256)
- **Payload** : données (userId, email, rôle, date d'expiration)
- **Signature** : hash cryptographique du header + payload avec la clé secrète du serveur

Le serveur vérifie la signature sans consulter la base de données — c'est ce qui rend l'authentification stateless. Toute modification du payload invalide la signature.

### Seed

Script qui peuple la base de données avec des données de test reproductibles. Le seed utilise `upsert` (insert ou update si existant) pour être idempotent — on peut le relancer autant de fois qu'on veut sans dupliquer les données.

---

## Frontend

### React

Bibliothèque JavaScript pour construire des interfaces utilisateur sous forme de **composants** — des fonctions qui retournent du JSX (HTML dans du JavaScript) et se recomposent pour former l'UI.

React gère un **DOM virtuel** : plutôt que de modifier directement le DOM HTML à chaque changement d'état, il calcule le diff entre l'ancien et le nouvel état, et n'applique que les modifications nécessaires.

### Vite

Outil de build frontend moderne. En développement, il sert les fichiers directement via ESM natif (pas de bundle) — démarrage quasi-instantané. En production, il bundle et optimise avec Rollup.

Remplace Create React App, qui était lent et mal maintenu.

### TailwindCSS

Framework CSS **utility-first** : plutôt que d'écrire des classes CSS nommées, on applique des classes atomiques directement dans le HTML/JSX. Chaque classe fait une seule chose (`p-4` = padding 16px, `text-blue-500` = couleur bleue).

Le responsive est géré par des préfixes de breakpoints : `md:w-1/2` signifie "largeur 50% à partir de 768px".

En production, Tailwind ne génère que les classes effectivement utilisées dans le code — le fichier CSS final est minuscule.

### TanStack Query

Bibliothèque de gestion du **server state** (état serveur) dans React. Gère automatiquement : le fetch des données, les états de chargement et d'erreur, le cache, la revalidation, et l'invalidation après une mutation.

Distinction fondamentale : le **client state** (état local de l'UI : un modal est-il ouvert ?) va dans `useState`. Le **server state** (données venant de l'API) va dans TanStack Query.

---

## CI/CD

### Intégration continue (CI)

Pipeline automatique déclenché à chaque push. Garantit que le code qui entre dans la branche principale compile, passe le lint, et passe les tests. Si une étape échoue, le merge est bloqué.

### Déploiement continu (CD)

Extension de la CI : si tous les tests passent sur `main`, le code est automatiquement déployé en production (ou en staging). Élimine le déploiement manuel.

### GitHub Actions

Plateforme de CI/CD intégrée à GitHub. Les pipelines sont définis dans des fichiers YAML dans `.github/workflows/`. Chaque `job` tourne dans une machine virtuelle Ubuntu fraîche — ce qui garantit la reproductibilité.

### Conventional Commits

Convention de nommage des messages de commit :

```
type(scope): description courte
```

Types courants :

- `feat` : nouvelle fonctionnalité
- `fix` : correction de bug
- `chore` : tâche de maintenance (config, dépendances)
- `docs` : documentation uniquement
- `test` : ajout ou modification de tests
- `refactor` : restructuration sans changement de comportement

Cette convention permet de générer automatiquement des changelogs et de comprendre l'historique Git d'un coup d'œil.
