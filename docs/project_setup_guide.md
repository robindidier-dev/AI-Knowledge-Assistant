# Guide d'initialisation d'un projet web professionnel

Ce document résume les grandes étapes **toujours vraies** lors du démarrage d'un projet web fullstack en équipe, indépendamment des technologies choisies. Il s'appuie sur le projet AI-Knowledge-Assistant (NestJS + React + PostgreSQL) comme fil conducteur.

---

## Les étapes invariantes

### 1. Choisir et figer les outils

Avant d'écrire une seule ligne de code métier, l'équipe se met d'accord sur :

- le **langage** et sa version (ex: Node.js 22 LTS)
- le **package manager** (npm, pnpm, yarn) — un seul pour tout le projet
- le **framework backend** et le **framework frontend**
- la **base de données** et son ORM
- les **outils de qualité de code** (linter, formateur)

Ces choix se documentent dans le `README.md` et se fixent via des fichiers de configuration versionnés. On ne les change pas en cours de route sans décision collective.

### 2. Initialiser le dépôt Git

```bash
git init
git remote add origin git@github.com:organisation/projet.git
```

**Toujours en premier**, avant tout fichier de code. Cela garantit que l'historique du projet commence dès le premier commit, y compris les fichiers de configuration.

Conventions à mettre en place immédiatement :

- un `.gitignore` adapté au langage et aux outils
- une branche `main` protégée (pas de push direct)
- un modèle de message de commit : **Conventional Commits** (`feat:`, `fix:`, `chore:`, `docs:`)

### 3. Configurer la qualité de code

Ces outils s'installent une fois et s'appliquent à tout le projet :

| Outil           | Rôle                                                    |
| --------------- | ------------------------------------------------------- |
| **ESLint**      | Détecte les erreurs de style et les mauvaises pratiques |
| **Prettier**    | Formate le code automatiquement                         |
| **Husky**       | Exécute des scripts avant chaque commit                 |
| **lint-staged** | Applique le lint uniquement aux fichiers modifiés       |

L'ordre d'exécution à chaque commit :

```
git commit → Husky déclenche lint-staged → ESLint + Prettier → si erreur : commit bloqué
```

### 4. Définir la structure du projet

Deux grandes approches :

**Monorepo** : tout le code (frontend, backend, packages partagés) dans un seul dépôt Git. Adapté aux projets où frontend et backend sont développés ensemble par la même équipe.

**Polyrepo** : un dépôt par application. Adapté aux équipes larges avec des cycles de déploiement indépendants.

Dans tous les cas, la structure de dossiers doit être décidée avant que chaque développeur commence à créer ses fichiers.

### 5. Mettre en place l'intégration continue (CI)

La CI est un pipeline automatique qui s'exécute à chaque push. Elle garantit qu'aucun code cassé n'entre dans la branche principale.

Pipeline minimal :

```
Push → Installation des dépendances → Lint → Tests → Build
```

Plus le projet avance, plus on y ajoute : tests d'intégration, analyse de sécurité, déploiement automatique (CD).

### 6. Configurer l'environnement de développement local

Chaque développeur doit pouvoir démarrer le projet en un minimum de commandes. L'objectif est le **onboarding en moins de 10 minutes** :

```bash
git clone git@github.com:org/projet.git
cd projet
pnpm install
cp apps/backend/.env.example apps/backend/.env
docker compose up -d
pnpm run dev
```

Ce flux est documenté dans le `README.md` et testé régulièrement.

### 7. Modéliser la base de données

Avant d'écrire les endpoints, on modélise les entités et leurs relations. Cette étape produit :

- un **schéma de base de données** (fichier `schema.prisma`, ou diagramme ERD)
- les **migrations initiales** versionnées dans Git
- un **script de seed** pour peupler la base avec des données de test

---

## Les fichiers de configuration fondamentaux

| Fichier               | Rôle                                                          |
| --------------------- | ------------------------------------------------------------- |
| `.gitignore`          | Fichiers exclus de Git (node_modules, .env, dist)             |
| `.nvmrc`              | Version de Node.js attendue par le projet                     |
| `.prettierrc`         | Règles de formatage du code                                   |
| `.eslintrc.js`        | Règles de qualité et style de code                            |
| `pnpm-workspace.yaml` | Déclaration des apps dans un monorepo pnpm                    |
| `docker-compose.yml`  | Services de développement local (BDD, cache…)                 |
| `.env.example`        | Variables d'environnement nécessaires (sans valeurs secrètes) |
| `README.md`           | Documentation de démarrage du projet                          |

---

## Les règles d'or

**Ne jamais commiter de secrets.** Les clés API, mots de passe et tokens vont dans `.env`, jamais dans le code. On commite uniquement `.env.example` avec des valeurs fictives.

**Le `main` est toujours déployable.** Tout le code qui entre dans `main` doit compiler, passer les tests, et être fonctionnel. On travaille sur des branches de feature.

**Le lockfile se commite.** `pnpm-lock.yaml` garantit que tout le monde installe exactement les mêmes versions. Ne jamais l'ajouter au `.gitignore`.

**La CI est non négociable.** Un projet sans CI accumule de la dette technique invisible. On la met en place dès le premier jour, même minimale.

**Le README est un contrat.** Si un nouveau développeur ne peut pas démarrer le projet en suivant le README, le README est faux — pas le développeur.
