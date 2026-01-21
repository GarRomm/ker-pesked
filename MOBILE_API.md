# API Mobile - Ker Pesked

Documentation complète de l'API mobile pour l'application Ker Pesked. Cette API utilise l'authentification JWT pour sécuriser les endpoints.

## Table des matières

- [Authentification](#authentification)
  - [Login](#login)
  - [Refresh Token](#refresh-token)
  - [Logout](#logout)
  - [Me (Informations utilisateur)](#me-informations-utilisateur)
- [Produits](#produits)
  - [Liste des produits](#liste-des-produits)
- [Format des réponses](#format-des-réponses)
- [Codes d'erreur](#codes-derreur)
- [Flow d'authentification](#flow-dauthentification)

## Authentification

### Login

Authentifie un utilisateur et retourne les tokens d'accès.

**Endpoint:** `POST /api/auth/mobile/login`

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "email": "admin@kerpesked.fr",
  "password": "admin123"
}
```

**Exemple avec curl:**
```bash
curl -X POST http://localhost:3000/api/auth/mobile/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@kerpesked.fr","password":"admin123"}'
```

**Réponse (200 OK):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "a1b2c3d4e5f6g7h8i9j0...",
    "expiresIn": 3600,
    "user": {
      "id": "user-uuid",
      "email": "admin@kerpesked.fr",
      "name": "Admin",
      "role": "ADMIN"
    }
  }
}
```

**Erreur (401 Unauthorized):**
```json
{
  "success": false,
  "error": "Email ou mot de passe incorrect"
}
```

---

### Refresh Token

Rafraîchit l'access token en utilisant le refresh token.

**Endpoint:** `POST /api/auth/mobile/refresh`

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "refreshToken": "a1b2c3d4e5f6g7h8i9j0..."
}
```

**Exemple avec curl:**
```bash
curl -X POST http://localhost:3000/api/auth/mobile/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"a1b2c3d4e5f6g7h8i9j0..."}'
```

**Réponse (200 OK):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 3600
  }
}
```

**Erreur (401 Unauthorized):**
```json
{
  "success": false,
  "error": "Refresh token invalide ou expiré"
}
```

---

### Logout

Déconnecte l'utilisateur en révoquant le refresh token.

**Endpoint:** `POST /api/auth/mobile/logout`

**Headers:**
```
Content-Type: application/json
Authorization: Bearer <access-token>
```

**Body:**
```json
{
  "refreshToken": "a1b2c3d4e5f6g7h8i9j0..."
}
```

**Exemple avec curl:**
```bash
curl -X POST http://localhost:3000/api/auth/mobile/logout \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{"refreshToken":"a1b2c3d4e5f6g7h8i9j0..."}'
```

**Réponse (200 OK):**
```json
{
  "success": true,
  "data": {
    "message": "Déconnexion réussie"
  }
}
```

**Erreur (401 Unauthorized):**
```json
{
  "success": false,
  "error": "Token d'authentification manquant"
}
```

---

### Me (Informations utilisateur)

Récupère les informations de l'utilisateur connecté.

**Endpoint:** `GET /api/auth/mobile/me`

**Headers:**
```
Authorization: Bearer <access-token>
```

**Exemple avec curl:**
```bash
curl -X GET http://localhost:3000/api/auth/mobile/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Réponse (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "user-uuid",
    "email": "admin@kerpesked.fr",
    "name": "Admin",
    "role": "ADMIN",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Erreur (401 Unauthorized):**
```json
{
  "success": false,
  "error": "Token invalide"
}
```

---

## Produits

### Liste des produits

Récupère la liste de tous les produits.

**Endpoint:** `GET /api/mobile/products`

**Headers:**
```
Authorization: Bearer <access-token>
```

**Exemple avec curl:**
```bash
curl -X GET http://localhost:3000/api/mobile/products \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Réponse (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "product-uuid",
      "name": "Saumon",
      "description": "Saumon frais de l'Atlantique",
      "price": 25.50,
      "stock": 10,
      "unit": "kg",
      "stockAlert": 5,
      "supplier": {
        "id": "supplier-uuid",
        "name": "Fournisseur Océan"
      }
    },
    {
      "id": "product-uuid-2",
      "name": "Thon",
      "description": null,
      "price": 18.00,
      "stock": 15,
      "unit": "kg",
      "stockAlert": 5,
      "supplier": null
    }
  ]
}
```

**Erreur (401 Unauthorized):**
```json
{
  "success": false,
  "error": "Token d'authentification manquant"
}
```

---

## Format des réponses

Toutes les réponses de l'API suivent un format standardisé :

### Succès
```json
{
  "success": true,
  "data": { ... }
}
```

### Erreur
```json
{
  "success": false,
  "error": "Message d'erreur descriptif"
}
```

---

## Codes d'erreur

| Code | Description |
|------|-------------|
| 200  | Succès |
| 400  | Mauvaise requête (validation échouée) |
| 401  | Non authentifié (token invalide/manquant) |
| 403  | Non autorisé (pas les permissions) |
| 404  | Ressource non trouvée |
| 500  | Erreur serveur |

---

## Flow d'authentification

### 1. Connexion initiale

```
Client                          Serveur
  |                                |
  |------ POST /login ------------>|
  |  {email, password}             |
  |                                |
  |<----- 200 OK ------------------|
  |  {accessToken, refreshToken}   |
  |                                |
```

### 2. Accès aux ressources protégées

```
Client                          Serveur
  |                                |
  |------ GET /products ---------> |
  |  Authorization: Bearer token   |
  |                                |
  |<----- 200 OK ------------------|
  |  {success: true, data: [...]}  |
  |                                |
```

### 3. Token expiré - Rafraîchissement

```
Client                          Serveur
  |                                |
  |------ GET /products ---------> |
  |  Authorization: Bearer token   |
  |                                |
  |<----- 401 Unauthorized --------|
  |  {error: "Token expiré"}       |
  |                                |
  |------ POST /refresh ---------->|
  |  {refreshToken}                |
  |                                |
  |<----- 200 OK ------------------|
  |  {accessToken, expiresIn}      |
  |                                |
  |------ GET /products ---------> |
  |  Authorization: Bearer newToken|
  |                                |
  |<----- 200 OK ------------------|
  |  {success: true, data: [...]}  |
  |                                |
```

### 4. Déconnexion

```
Client                          Serveur
  |                                |
  |------ POST /logout ----------->|
  |  Authorization: Bearer token   |
  |  {refreshToken}                |
  |                                |
  |<----- 200 OK ------------------|
  |  {message: "Déconnexion..."}   |
  |                                |
```

---

## Notes importantes

### Sécurité

- **Stockage des tokens** : Stockez les tokens de manière sécurisée (Keychain sur iOS, Keystore sur Android)
- **HTTPS** : Utilisez toujours HTTPS en production
- **Expiration** : L'access token expire après 1 heure par défaut
- **Refresh token** : Le refresh token expire après 7 jours par défaut

### Gestion des erreurs

Toutes les erreurs suivent le format :
```json
{
  "success": false,
  "error": "Message d'erreur"
}
```

Gérez les erreurs 401 en rafraîchissant le token ou en demandant une nouvelle connexion si le refresh échoue.

### Variables d'environnement

Pour configurer l'API JWT, ajoutez ces variables dans votre `.env` :

```env
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_EXPIRES_IN="1h"
REFRESH_TOKEN_EXPIRES_IN="7d"
```

---

## Exemple d'implémentation Flutter

```dart
class ApiService {
  String? _accessToken;
  String? _refreshToken;
  
  Future<void> login(String email, String password) async {
    final response = await http.post(
      Uri.parse('$baseUrl/api/auth/mobile/login'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'email': email, 'password': password}),
    );
    
    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      _accessToken = data['data']['accessToken'];
      _refreshToken = data['data']['refreshToken'];
      // Sauvegarder les tokens de manière sécurisée
    }
  }
  
  Future<List<Product>> getProducts() async {
    final response = await http.get(
      Uri.parse('$baseUrl/api/mobile/products'),
      headers: {'Authorization': 'Bearer $_accessToken'},
    );
    
    if (response.statusCode == 401) {
      // Token expiré, rafraîchir
      await refreshToken();
      return getProducts(); // Réessayer
    }
    
    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      return (data['data'] as List)
          .map((p) => Product.fromJson(p))
          .toList();
    }
    
    throw Exception('Failed to load products');
  }
  
  Future<void> refreshToken() async {
    final response = await http.post(
      Uri.parse('$baseUrl/api/auth/mobile/refresh'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'refreshToken': _refreshToken}),
    );
    
    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      _accessToken = data['data']['accessToken'];
      // Sauvegarder le nouveau token
    } else {
      // Refresh token invalide, redemander connexion
      await logout();
    }
  }
  
  Future<void> logout() async {
    await http.post(
      Uri.parse('$baseUrl/api/auth/mobile/logout'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $_accessToken',
      },
      body: jsonEncode({'refreshToken': _refreshToken}),
    );
    
    _accessToken = null;
    _refreshToken = null;
    // Supprimer les tokens du stockage sécurisé
  }
}
```

---

## Support

Pour toute question ou problème, contactez l'équipe de développement.

---

## Configuration CORS

### Développement

En développement, toutes les origines sont autorisées par défaut :

```env
ALLOWED_ORIGINS=*
```

### Production

En production, spécifier explicitement les domaines autorisés :

```env
ALLOWED_ORIGINS=https://votre-app.com,https://api.votre-app.com
```

### Test CORS

Pour tester que CORS fonctionne :

```bash
# Requête preflight (OPTIONS)
curl -X OPTIONS http://localhost:3000/api/mobile/products \
  -H "Origin: http://localhost:8080" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: Authorization" \
  -v

# La réponse doit contenir les headers CORS
```

### Erreurs CORS courantes

**Erreur : "No 'Access-Control-Allow-Origin' header"**

- Vérifier que `ALLOWED_ORIGINS` est défini dans `.env`
- Vérifier que le serveur Next.js a été redémarré après modification

**Erreur : "CORS policy: Response to preflight request doesn't pass"**

- Le middleware CORS gère automatiquement les requêtes OPTIONS
- Vérifier que les headers CORS sont présents dans la réponse OPTIONS
