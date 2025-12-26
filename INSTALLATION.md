# Guide d'installation et de déploiement - Ker Pesked

Ce document détaille les étapes pour installer, configurer et déployer l'application Ker Pesked.

## 📋 Prérequis

- **Node.js** version 18.x ou supérieure
- **MySQL** version 8.0 ou supérieure
- **npm** ou **yarn**
- Un éditeur de code (VS Code recommandé)

## 🚀 Installation locale

### 1. Cloner le repository

```bash
git clone https://github.com/GarRomm/ker-pesked.git
cd ker-pesked
```

### 2. Installer les dépendances

```bash
npm install
```

### 3. Configurer MySQL

#### Créer la base de données

Connectez-vous à MySQL :
```bash
mysql -u root -p
```

Créez la base de données :
```sql
CREATE DATABASE ker_pesked CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EXIT;
```

#### Créer un utilisateur (optionnel mais recommandé)

```sql
CREATE USER 'kerpesked_user'@'localhost' IDENTIFIED BY 'votre_mot_de_passe_securise';
GRANT ALL PRIVILEGES ON ker_pesked.* TO 'kerpesked_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 4. Configurer les variables d'environnement

Copiez le fichier d'exemple :
```bash
cp .env.example .env
```

Modifiez le fichier `.env` avec vos informations :

```env
# Base de données
DATABASE_URL="mysql://kerpesked_user:votre_mot_de_passe_securise@localhost:3306/ker_pesked"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="votre-secret-tres-securise-changez-ceci"
```

Pour générer un `NEXTAUTH_SECRET` sécurisé :
```bash
openssl rand -base64 32
```

### 5. Créer les tables de la base de données

Générez le client Prisma :
```bash
npm run db:generate
```

Créez les tables via les migrations :
```bash
npm run db:migrate
```

### 6. Peupler la base de données avec des données d'exemple

```bash
npm run db:seed
```

Ceci créera :
- 2 utilisateurs (admin et employé)
- 2 fournisseurs
- 8 produits de poissonnerie
- 4 clients
- 3 commandes d'exemple

### 7. Lancer l'application en mode développement

```bash
npm run dev
```

L'application sera accessible sur [http://localhost:3000](http://localhost:3000)

### 8. Se connecter

Utilisez l'un des comptes créés :

**Administrateur :**
- Email: `admin@kerpesked.fr`
- Mot de passe: `admin123`

**Employé :**
- Email: `employee@kerpesked.fr`
- Mot de passe: `employee123`

## 🏗️ Déploiement en production

### Option 1 : Déploiement sur Vercel

1. **Préparer le projet**
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push
   ```

2. **Configurer Vercel**
   - Créez un compte sur [Vercel](https://vercel.com)
   - Importez votre repository GitHub
   - Configurez les variables d'environnement dans Vercel :
     - `DATABASE_URL`
     - `NEXTAUTH_URL` (l'URL de votre déploiement Vercel)
     - `NEXTAUTH_SECRET`

3. **Configurer la base de données**
   - Utilisez un service MySQL hébergé (PlanetScale, AWS RDS, etc.)
   - Mettez à jour `DATABASE_URL` avec l'URL de production

4. **Déployer**
   - Vercel déploiera automatiquement votre application
   - Exécutez les migrations depuis votre machine locale :
     ```bash
     DATABASE_URL="votre-url-production" npx prisma migrate deploy
     DATABASE_URL="votre-url-production" npm run db:seed
     ```

### Option 2 : Déploiement sur un serveur VPS

1. **Préparer le serveur**
   ```bash
   # Installer Node.js
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   
   # Installer MySQL
   sudo apt update
   sudo apt install mysql-server
   
   # Configurer MySQL
   sudo mysql_secure_installation
   ```

2. **Cloner et configurer le projet**
   ```bash
   cd /var/www
   git clone https://github.com/GarRomm/ker-pesked.git
   cd ker-pesked
   npm install
   ```

3. **Configurer les variables d'environnement**
   ```bash
   cp .env.example .env
   nano .env
   ```

4. **Builder l'application**
   ```bash
   npm run build
   ```

5. **Utiliser PM2 pour gérer l'application**
   ```bash
   npm install -g pm2
   pm2 start npm --name "ker-pesked" -- start
   pm2 startup
   pm2 save
   ```

6. **Configurer Nginx comme reverse proxy**
   ```nginx
   server {
       listen 80;
       server_name votre-domaine.com;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

## 🔧 Maintenance

### Sauvegarder la base de données

```bash
mysqldump -u root -p ker_pesked > backup_$(date +%Y%m%d).sql
```

### Restaurer une sauvegarde

```bash
mysql -u root -p ker_pesked < backup_20231225.sql
```

### Mettre à jour l'application

```bash
git pull
npm install
npm run db:migrate
npm run build
pm2 restart ker-pesked
```

### Voir les logs

```bash
# Logs PM2
pm2 logs ker-pesked

# Logs MySQL
sudo tail -f /var/log/mysql/error.log
```

## 🐛 Dépannage

### Erreur de connexion à la base de données

Vérifiez :
- Le service MySQL est démarré : `sudo systemctl status mysql`
- Les identifiants dans `.env` sont corrects
- L'utilisateur MySQL a les permissions nécessaires

### Erreur "Module not found"

```bash
rm -rf node_modules package-lock.json
npm install
```

### Erreur Prisma

```bash
npm run db:generate
npx prisma migrate reset  # Attention : supprime toutes les données
npm run db:seed
```

## 📞 Support

Pour toute question ou problème, consultez la documentation ou créez une issue sur GitHub.
