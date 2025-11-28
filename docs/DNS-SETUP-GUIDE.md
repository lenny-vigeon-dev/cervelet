# Guide de Configuration DNS pour pixelhub.now

## Étape 1 : Vérification du domaine dans Google Search Console

Avant de configurer Cloud Run, vous devez prouver que vous possédez le domaine.

### 1.1 Aller sur Google Search Console
- URL : https://search.google.com/search-console
- Connectez-vous avec votre compte Google lié au projet GCP

### 1.2 Ajouter une propriété
- Cliquez sur "Ajouter une propriété"
- Sélectionnez "Domaine" (pas "Préfixe d'URL")
- Entrez : `pixelhub.now`

### 1.3 Vérifier via DNS
Google vous donnera un enregistrement TXT à ajouter. Par exemple :
```
Type: TXT
Nom: @ (ou pixelhub.now)
Valeur: google-site-verification=xxxxxxxxxxxxxxxxx
```

**Où ajouter cet enregistrement ?**
- Chez votre registrar (où vous avez acheté pixelhub.now)
- Exemples de registrars courants :
  - **Google Domains** : domains.google.com → DNS → Enregistrements personnalisés
  - **Cloudflare** : cloudflare.com → DNS → Add record
  - **OVH** : ovh.com → Zone DNS
  - **Namecheap** : namecheap.com → Advanced DNS

## Étape 2 : Configuration DNS pour Cloud Run

Une fois le domaine vérifié, exécutez le script :
```bash
./setup-domain.sh
```

Le script affichera les enregistrements DNS nécessaires. Vous aurez **2 options** :

### Option A : Enregistrements A et AAAA (Domaine racine)

Pour utiliser directement `pixelhub.now` (sans www ou sous-domaine) :

**⚠️ ATTENTION : Les IPs ci-dessous sont des EXEMPLES !**

Les adresses IP sont **générées dynamiquement** par Google Cloud lors de la création du domain mapping. Vous DEVEZ d'abord exécuter `./setup-domain.sh` qui affichera les IPs exactes à utiliser pour votre configuration.

Format des enregistrements (avec IPs d'exemple) :

```
Type: A
Nom: @ (ou pixelhub.now ou laisser vide selon registrar)
Valeur: [IP fournie par setup-domain.sh - exemple: 216.239.32.21]
TTL: 3600

Type: A
Nom: @
Valeur: [IP fournie par setup-domain.sh - exemple: 216.239.34.21]
TTL: 3600

Type: A
Nom: @
Valeur: [IP fournie par setup-domain.sh - exemple: 216.239.36.21]
TTL: 3600

Type: A
Nom: @
Valeur: [IP fournie par setup-domain.sh - exemple: 216.239.38.21]
TTL: 3600

Type: AAAA
Nom: @
Valeur: [IPv6 fournie par setup-domain.sh - exemple: 2001:4860:4802:32::15]
TTL: 3600

Type: AAAA
Nom: @
Valeur: [IPv6 fournie par setup-domain.sh - exemple: 2001:4860:4802:34::15]
TTL: 3600

Type: AAAA
Nom: @
Valeur: [IPv6 fournie par setup-domain.sh - exemple: 2001:4860:4802:36::15]
TTL: 3600

Type: AAAA
Nom: @
Valeur: [IPv6 fournie par setup-domain.sh - exemple: 2001:4860:4802:38::15]
TTL: 3600
```

**Total : 4 enregistrements A + 4 enregistrements AAAA = 8 enregistrements**

### Option B : Enregistrement CNAME (Sous-domaine - PLUS SIMPLE)

Pour utiliser `www.pixelhub.now` ou `app.pixelhub.now` :

```
Type: CNAME
Nom: www (ou app, ou api, etc.)
Valeur: ghs.googlehosted.com
TTL: 3600
```

**⚠️ RECOMMANDATION : Utilisez l'Option B avec un sous-domaine**
- Plus simple (1 seul enregistrement au lieu de 8)
- Plus flexible
- Configuration plus rapide

## Étape 3 : Vérification

### 3.1 Vérifier la propagation DNS
```bash
# Pour le domaine racine
dig pixelhub.now A
dig pixelhub.now AAAA

# Pour un sous-domaine
dig www.pixelhub.now CNAME
```

Ou utilisez un outil en ligne : https://dnschecker.org

### 3.2 Vérifier le statut Cloud Run
```bash
gcloud run domain-mappings describe \
  --domain pixelhub.now \
  --region europe-west1
```

Cherchez `certificateMode: AUTOMATIC` et `routeReady: true`

## Étape 4 : Attendre le certificat SSL

Une fois les DNS configurés correctement :
- Google provisionnera automatiquement un certificat SSL
- Cela prend généralement 15-60 minutes
- Votre site sera accessible en HTTPS

## Exemples concrets par registrar

### Si vous utilisez Cloudflare :
1. Allez sur cloudflare.com
2. Sélectionnez votre domaine `pixelhub.now`
3. Onglet "DNS"
4. Cliquez "Add record"
5. Ajoutez les enregistrements A/AAAA ou CNAME
6. **IMPORTANT** : Désactivez le proxy Cloudflare (nuage gris, pas orange) pour que Google puisse gérer le SSL

### Si vous utilisez Google Domains :
1. Allez sur domains.google.com
2. Cliquez sur votre domaine
3. Menu "DNS" à gauche
4. Section "Enregistrements personnalisés"
5. Ajoutez les enregistrements

### Si vous utilisez Namecheap :
1. Dashboard Namecheap
2. Manage domain → Advanced DNS
3. Add New Record
4. Ajoutez les enregistrements

## Troubleshooting

### Le domaine ne se résout pas
- Attendez 5-60 minutes pour la propagation DNS
- Vérifiez avec `dig` ou dnschecker.org
- Assurez-vous d'avoir bien ajouté TOUS les enregistrements

### Erreur "Domain verification failed"
- Vérifiez que le domaine est validé dans Google Search Console
- Le compte Google doit être lié au projet GCP

### Erreur de certificat SSL
- Le certificat est automatique mais prend du temps
- Attendez jusqu'à 24h dans de rares cas
- Vérifiez que les DNS pointent bien vers Google

## Commandes utiles

```bash
# Voir tous les mappings de domaine
gcloud run domain-mappings list --region=europe-west1

# Supprimer un mapping
gcloud run domain-mappings delete --domain=pixelhub.now --region=europe-west1

# Voir les détails d'un mapping
gcloud run domain-mappings describe --domain=pixelhub.now --region=europe-west1
```
