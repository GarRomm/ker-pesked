# Ker Pesked

Ker Pesked est une application Next.js de gestion de commandes et de stocks, spécifiquement adaptée à une poissonnerie. Elle utilise Next.js pour le front-end et le back-end, et MySQL pour la base de données.

## 🐟 Fonctionnalités

### Gestion des produits
- Ajouter, modifier et supprimer des produits
- Suivi des informations : nom, prix, quantité en stock, unité de mesure
- Alertes de seuil de stock faible
- Association avec les fournisseurs

### Gestion des commandes
- Enregistrer les commandes des clients
- Suivi par statut (En cours, Livrée, Annulée)
- Gestion automatique des stocks lors des commandes
- Historique des commandes par client

### Tableau de bord
- Statistiques sur les produits les plus vendus
- Suivi des niveaux de stocks critiques
- Graphiques et visualisations (Recharts)
- Vue d'ensemble des commandes récentes
- Calcul du revenu total

### Gestion des clients et fournisseurs
- Gestion des informations clients (nom, email, téléphone, adresse)
- Gestion des fournisseurs
- Historique des commandes par client

### Authentification et sécurisation
- Authentification avec NextAuth.js
- Gestion des rôles (Admin, Employé)
- Protection des routes et API

## 🚀 Installation

### Prérequis
- Node.js 18+ 
- MySQL 8.0+
- npm ou yarn

### Étapes d'installation

1. **Cloner le repository**
```bash
git clone https://github.com/GarRomm/ker-pesked.git
cd ker-pesked
```

2. **Installer les dépendances**
```bash
npm install
```

3. **Configurer la base de données**

Créer une base de données MySQL :
```sql
CREATE DATABASE ker_pesked;
```

Copier le fichier `.env.example` vers `.env` et configurer les variables :
```bash
cp .env.example .env
```

Éditer `.env` avec vos informations :
```env
DATABASE_URL="mysql://user:password@localhost:3306/ker_pesked"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-change-this-in-production"
```

4. **Générer le client Prisma et créer les tables**
```bash
npm run db:generate
npm run db:migrate
```

5. **Peupler la base de données avec des données d'exemple**
```bash
npm run db:seed
```

6. **Lancer l'application en mode développement**
```bash
npm run dev
```

L'application sera accessible sur [http://localhost:3000](http://localhost:3000)

## 👤 Connexion par défaut

Après avoir exécuté le script de seed, vous pouvez vous connecter avec :

**Administrateur :**
- Email: `admin@kerpesked.fr`
- Mot de passe: `admin123`

**Employé :**
- Email: `employee@kerpesked.fr`
- Mot de passe: `employee123`

## 📦 Structure du projet

```
ker-pesked/
├── app/                    # Application Next.js (App Router)
│   ├── api/               # Routes API
│   │   ├── auth/         # Authentification NextAuth
│   │   ├── products/     # API Produits
│   │   ├── orders/       # API Commandes
│   │   ├── customers/    # API Clients
│   │   ├── suppliers/    # API Fournisseurs
│   │   └── dashboard/    # API Statistiques
│   ├── dashboard/        # Page tableau de bord
│   ├── products/         # Page gestion produits
│   ├── orders/           # Page gestion commandes
│   ├── customers/        # Page gestion clients
│   ├── suppliers/        # Page gestion fournisseurs
│   └── login/            # Page de connexion
├── components/            # Composants réutilisables
├── lib/                   # Utilitaires
│   ├── prisma.ts         # Client Prisma
│   └── auth.ts           # Configuration NextAuth
├── prisma/               # Schéma et migrations Prisma
│   └── schema.prisma     # Modèles de données
├── scripts/              # Scripts utilitaires
│   └── seed.ts           # Script de seed de données
└── types/                # Types TypeScript

```

## 🛠️ Technologies utilisées

- **Next.js 16** - Framework React full-stack
- **TypeScript** - Typage statique
- **Prisma** - ORM pour MySQL
- **NextAuth.js** - Authentification
- **MySQL** - Base de données
- **Tailwind CSS** - Framework CSS
- **Recharts** - Bibliothèque de graphiques
- **bcryptjs** - Hachage de mots de passe

## 📊 Modèle de données

Le schéma de base de données inclut :
- **User** : Utilisateurs avec authentification et rôles
- **Customer** : Clients de la poissonnerie
- **Supplier** : Fournisseurs de produits
- **Product** : Produits avec stock et prix
- **Order** : Commandes avec statut
- **OrderItem** : Détails des produits commandés

## 🔧 Scripts disponibles

```bash
npm run dev          # Démarrer en mode développement
npm run build        # Compiler pour la production
npm run start        # Démarrer en mode production
npm run lint         # Linter le code
npm run db:generate  # Générer le client Prisma
npm run db:migrate   # Créer/appliquer les migrations
npm run db:seed      # Peupler la base de données
npm run db:studio    # Ouvrir Prisma Studio
```

## 🔐 Sécurité

- Mots de passe hachés avec bcryptjs
- Sessions JWT avec NextAuth.js
- Protection des routes API
- Validation des données
- Variables d'environnement pour les secrets

## 📝 Licence

Ce projet est développé pour Ker Pesked.