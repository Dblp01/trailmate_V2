# TrailMate

Coach trail IA personnel: plans d'entrainement, suivi des seances, objectifs et synchronisation Strava.

## Important

TrailMate utilise des fonctions Netlify:

- `/.netlify/functions/claude` pour l'IA
- `/.netlify/functions/strava-token` pour l'echange OAuth Strava
- `/.netlify/functions/config` pour exposer seulement la configuration publique
- `/.netlify/functions/data` pour synchroniser les plans, seances, objectifs et bilans entre appareils

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
Les donnees sportives partagees sont synchronisees via Netlify Blobs. Les tokens Strava restent locaux au navigateur.

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

Par defaut, une app Strava non revue peut etre limitee a un seul athlete connecte. Pour connecter plusieurs comptes avec la meme app Strava, demande une augmentation de quota/revue a Strava. En attendant, chaque athlete peut creer sa propre app Strava et saisir son Client ID/Secret dans TrailMate > Strava > Configurer.

## Utilisation

- Plans IA: creation de plans semaine par semaine
- Seances: saisie manuelle et import Strava
- Coach IA: conversation avec le contexte de tes donnees
- Objectifs: calendrier de courses avec compte a rebours
- Profils: bascule entre Toi et Lonny avec donnees separees
- Cloud: plans, seances, objectifs et bilans partages entre appareils
- Bilan IA: resume hebdomadaire coach depuis le tableau de bord
- Plans modifiables: coche les seances faites et regenere une semaine par IA
