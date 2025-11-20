## Bot Discord — installation et utilisation

Ce document explique comment installer, configurer et lancer le bot Discord contenu dans le dossier `discord/`.

## Prérequis

- Node.js (version 16+ recommandée)
- npm (ou un autre gestionnaire de paquets : pnpm/yarn)
- Un compte Discord et une application/bot créée sur le portail des développeurs Discord

## Installation

1. Placez-vous dans le dossier `discord/` du projet :

```bash
cd discord
```

2. Installez les dépendances avec npm :

```bash
npm install
```

Remarque : si vous utilisez `pnpm` dans le reste du projet, vous pouvez aussi lancer `pnpm install`.

## Configuration (.env)

Créez un fichier `.env` dans le dossier `discord/` (ou mettez les variables d'environnement dans votre environnement système) avec au minimum les variables suivantes :

```env
# Jeton du bot
DISCORD_TOKEN=your_bot_token_here

# ID de l'application (Client ID)
CLIENT_ID=your_application_client_id

# ID du serveur discord
GUILD_ID=your_test_guild_id

```

Explications :
- `DISCORD_TOKEN` : token du bot fourni par le portail Discord Developer.
- `CLIENT_ID` : identifiant de l'application (utilisé pour enregistrer les commandes slash).
- `GUILD_ID` : (recommandé pour le développement) permet d'enregistrer rapidement les commandes dans un serveur précis; sans `GUILD_ID` les commandes sont enregistrées globalement et la propagation peut prendre jusqu'à 1 heure.

Ne partagez jamais votre `DISCORD_TOKEN` publiquement.

## Scripts utiles

Dans le dossier `discord/`, les scripts suivants sont disponibles via `npm run` :

- `npm run dev` : lance le bot en mode développement. Utilisez ce mode pour tester localement.
- `npm run deploy` : enregistre/déploie les commandes slash auprès de l'API Discord (généralement en utilisant `CLIENT_ID` et `GUILD_ID`). Exécutez ce script après toute modification des commandes pour les appliquer.

Exemples :

```bash
# Déployer/mettre à jour les commandes slash
npm run deploy

# Lancer le bot en local
npm run dev

```

## Flux recommandé

1. Configurer `.env` avec `DISCORD_TOKEN`, `CLIENT_ID` et `GUILD_ID`.
2. Lancer `npm run deploy` pour enregistrer les commandes (surtout si vous avez modifié les commandes slash).
3. Lancer `npm run dev` pour démarrer le bot et vérifier le comportement.

## Dépannage rapide

- Jeton invalide / Erreur d'authentification : vérifiez `DISCORD_TOKEN` et que le bot est bien ajouté au serveur.
- Commandes qui n'apparaissent pas : si vous avez déployé globalement, attendez jusqu'à 1 heure pour la propagation ; pour vitesse, utilisez `GUILD_ID` et un déploiement en mode guild.
- Permissions du bot : assurez-vous que le bot a les scopes et permissions nécessaires (ex. `applications.commands`, `bot` et permissions de lecture/envoi de messages si nécessaire).

## Contribution

Si vous souhaitez modifier ou ajouter des commandes :

1. Éditez/ajoutez les fichiers de commandes dans `discord/src/commands` (ou l'emplacement du code des commandes).
2. Lancez `npm run deploy` pour mettre à jour les commandes.
3. Testez en local avec `npm run dev`.
