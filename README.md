# TrailMate

Coach trail IA personnel: plans d'entrainement, suivi des seances, objectifs et synchronisation Strava.

## Important

TrailMate utilise des fonctions Netlify:

- `/.netlify/functions/claude` pour l'IA
- `/.netlify/functions/strava-token` pour l'echange OAuth Strava
- `/.netlify/functions/config` pour exposer seulement la configuration publique

Un simple deploiement GitHub Pages ne suffit donc pas pour l'IA et Strava. Deploie le dossier sur Netlify.

## Configuration Netlify

1. Cree un site Netlify depuis ce dossier/repo.
2. Ajoute les variables d'environnement:
   - `ANTHROPIC_API_KEY`
   - `STRAVA_CLIENT_ID`
   - `STRAVA_CLIENT_SECRET`
3. Verifie que Netlify lit bien `netlify.toml`.
4. Deploie le site.

Une fois deployee, l'app est utilisable 24/7 avec une URL Netlify. Chaque navigateur garde ses propres donnees locales et ses propres profils.

## Lancer en local

1. Copie `.env.example` vers `.env`.
2. Remplis les valeurs dans `.env`.
3. Lance:

```bash
node local-server.js
```

Puis ouvre http://localhost:8888.

## Configuration Strava

Sur https://www.strava.com/settings/api :

- Nom: `TrailMate`
- Site Web: l'URL de ton site Netlify
- Domaine du rappel: le domaine Netlify, sans `https://` et sans chemin

Exemple: si ton site est `https://trailmate-demo.netlify.app`, le domaine du rappel est `trailmate-demo.netlify.app`.

## Utilisation

- Plans IA: creation de plans semaine par semaine
- Seances: saisie manuelle et import Strava
- Coach IA: conversation avec le contexte de tes donnees
- Objectifs: calendrier de courses avec compte a rebours
- Profils: bascule entre Toi et Lonny avec donnees separees
