# Architecture - Ker Pesked

Ce document décrit l'architecture technique de l'application Ker Pesked.

## 🏗️ Vue d'ensemble

Ker Pesked est une application web full-stack construite avec Next.js 16 utilisant le App Router. Elle suit une architecture moderne en trois couches :

```
┌─────────────────────────────────────┐
│         Frontend (React)            │
│    Pages, Components, Hooks         │
└─────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────┐
│      API Routes (Next.js)           │
│    Business Logic, Validation       │
└─────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────┐
│     Database (MySQL + Prisma)       │
│         Data Persistence            │
└─────────────────────────────────────┘
```

## 📁 Structure du projet

```
ker-pesked/
├── app/                          # Application Next.js (App Router)
│   ├── api/                      # API Routes
│   │   ├── auth/                 # Authentification
│   │   │   └── [nextauth]/       # NextAuth.js handler
│   │   ├── products/             # CRUD Produits
│   │   │   ├── route.ts          # GET all, POST
│   │   │   └── [id]/             # GET one, PUT, DELETE
│   │   ├── orders/               # CRUD Commandes
│   │   ├── customers/            # CRUD Clients
│   │   ├── suppliers/            # CRUD Fournisseurs
│   │   ├── dashboard/            # Statistiques
│   │   └── users/                # Gestion utilisateurs
│   ├── dashboard/                # Page tableau de bord
│   ├── products/                 # Page produits
│   ├── orders/                   # Page commandes
│   ├── customers/                # Page clients
│   ├── suppliers/                # Page fournisseurs
│   ├── login/                    # Page connexion
│   ├── layout.tsx                # Layout global
│   ├── page.tsx                  # Page d'accueil (redirect)
│   └── globals.css               # Styles globaux
├── components/                    # Composants réutilisables
│   ├── Navigation.tsx            # Barre de navigation
│   └── Providers.tsx             # Session provider
├── lib/                          # Utilitaires et configurations
│   ├── prisma.ts                 # Client Prisma singleton
│   └── auth.ts                   # Configuration NextAuth
├── prisma/                       # Schéma et migrations Prisma
│   ├── schema.prisma             # Modèle de données
│   └── migrations/               # Migrations de base de données
├── scripts/                      # Scripts utilitaires
│   └── seed.ts                   # Script de peuplement DB
├── types/                        # Types TypeScript globaux
│   └── next-auth.d.ts            # Types NextAuth
└── public/                       # Assets statiques
```

## 🔄 Flux de données

### 1. Authentification

```
User Login → NextAuth.js → Credentials Provider → Prisma User Query
     ↓                                                      ↓
Session JWT ← JWT Callback ← bcrypt password check ← User Found
```

### 2. Requête API typique

```
Client Request → API Route → Session Check → Business Logic
                                    ↓              ↓
                              Unauthorized    Prisma Query
                                    ↓              ↓
                              401 Error      Database
                                                   ↓
                                            JSON Response
```

### 3. Gestion d'une commande

```
Order Form → POST /api/orders → Validate Stock → Create Order
                                      ↓               ↓
                                Stock Check    Create OrderItems
                                      ↓               ↓
                                Update Stock  → Return Order + Items
```

## 🗃️ Modèle de données

### Relations

```
User (1) ──────────────────────────────── (n) Session
                                           
Customer (1) ────────────── (n) Order ────── (n) OrderItem ────── (1) Product (n) ────── (1) Supplier
```

### Schéma détaillé

#### User
- Authentification et autorisation
- Rôles : ADMIN, EMPLOYEE
- Mot de passe hashé avec bcryptjs

#### Product
- Informations produit
- Stock en temps réel
- Alerte de stock faible (stockAlert)
- Relation avec Supplier

#### Order
- Statut : PENDING, DELIVERED, CANCELLED
- Relation avec Customer
- Total calculé

#### OrderItem
- Table de liaison Order ↔ Product
- Quantité et prix au moment de la commande
- Permet l'historique des prix

## 🔐 Sécurité

### Authentification
- **NextAuth.js** avec stratégie JWT
- Sessions côté client et serveur
- Refresh automatique des tokens

### Autorisation
- Middleware de vérification de session sur toutes les API routes
- Contrôle d'accès basé sur les rôles (RBAC)
- Protection CSRF intégrée dans Next.js

### Base de données
- Validation des entrées avec Zod (optionnel)
- Prepared statements via Prisma (protection SQL injection)
- Hachage des mots de passe (bcryptjs)

### Variables sensibles
- Stockage dans `.env` (non commité)
- Accès via `process.env`
- Validation au démarrage

## 🎨 Frontend

### Stack
- **React 19** avec Server Components
- **Tailwind CSS** pour le styling
- **Recharts** pour les graphiques
- **next-auth/react** pour la gestion de session client

### Patterns
- Client Components (`'use client'`) pour l'interactivité
- Server Components par défaut pour les performances
- Hooks React standards (useState, useEffect)
- Context API via Providers

### État
- État local avec useState pour les formulaires
- Session globale via NextAuth
- Pas de state management complexe (Redux, etc.)

## 🔌 API Design

### Conventions REST

```
GET    /api/products       → Liste tous les produits
POST   /api/products       → Crée un produit
GET    /api/products/:id   → Récupère un produit
PUT    /api/products/:id   → Met à jour un produit
DELETE /api/products/:id   → Supprime un produit
```

### Format des réponses

**Succès :**
```json
{
  "id": "uuid",
  "name": "Saumon",
  "price": 24.90,
  ...
}
```

**Erreur :**
```json
{
  "error": "Message d'erreur descriptif"
}
```

### Codes HTTP
- `200` : Succès
- `201` : Créé
- `400` : Requête invalide
- `401` : Non authentifié
- `404` : Non trouvé
- `500` : Erreur serveur

## 📊 Performance

### Optimisations
- **Static Generation** pour les pages publiques
- **Server Components** pour réduire le JavaScript client
- **Dynamic Imports** pour le code-splitting
- **Connection pooling** MySQL via Prisma

### Caching
- Next.js cache automatique pour les pages statiques
- Headers de cache pour les assets
- Session cache avec JWT

## 🧪 Tests (à implémenter)

### Structure recommandée
```
tests/
├── unit/              # Tests unitaires
│   ├── lib/
│   └── utils/
├── integration/       # Tests d'intégration API
│   └── api/
└── e2e/              # Tests end-to-end
    └── pages/
```

### Outils suggérés
- **Jest** pour les tests unitaires
- **React Testing Library** pour les composants
- **Playwright** pour les tests E2E
- **Prisma test environment** pour la DB

## 🚀 Déploiement

### Build process
1. `npm run build` → Compilation Next.js
2. Génération des pages statiques
3. Optimisation des assets
4. Output dans `.next/`

### Variables d'environnement requises
- `DATABASE_URL`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`

### Considérations production
- Utiliser un service MySQL managé
- Configurer les logs
- Mettre en place un monitoring
- Backups automatiques de la DB
- CDN pour les assets statiques

## 📈 Évolutions futures

### Fonctionnalités suggérées
- [ ] Rapports PDF des commandes
- [ ] Export Excel des données
- [ ] Notifications par email
- [ ] Application mobile (React Native)
- [ ] API publique pour partenaires
- [ ] Gestion multi-magasins
- [ ] Système de réservation en ligne
- [ ] Intégration système de paiement

### Améliorations techniques
- [ ] Tests automatisés (Jest, Playwright)
- [ ] CI/CD avec GitHub Actions
- [ ] Monitoring (Sentry, DataDog)
- [ ] Cache Redis
- [ ] Websockets pour mises à jour temps réel
- [ ] GraphQL API en alternative à REST
- [ ] Internationalisation (i18n)
