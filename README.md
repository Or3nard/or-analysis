# OR Analysis

Dashboard d'analyse de matchs de football (tracking Second Spectrum + événements Opta), avec comptes utilisateurs.

- **Analyse tactique** : classement, xG, tirs, passes qui cassent la ligne, progression, pressing (PPDA), possessions, récupérations…
- **Physique** : distance, m/min, zones de vitesse, haute intensité, sprints, vitesse max, avec / sans ballon, évolution par 5 min.
- **Filtres** : équipe, journée, match, joueur, quart d'heure.
- **Comptes** : chaque utilisateur se connecte avec son e-mail et son mot de passe et dispose de son propre espace
  de données en ligne, invisible pour les autres.

Hébergement gratuit : site sur **GitHub Pages**, comptes et stockage sur **Supabase** (offre gratuite).

## Mise en place (une seule fois, ~10 min)

### 1. Supabase
1. Créer un compte gratuit sur <https://supabase.com> puis **New project** (région Europe, ex. Paris ou Francfort).
2. **SQL Editor** → coller le contenu de [`setup.sql`](setup.sql) → **Run**.
3. **Authentication → Sign In / Providers** → désactiver **Allow new users to sign up**
   (personne ne peut créer de compte seul : c'est vous qui créez les accès).
4. **Authentication → URL Configuration** → *Site URL* = l'adresse du site GitHub Pages
   (ex. `https://<compte>.github.io/or-analysis/`), et l'ajouter aussi dans *Redirect URLs*.
5. **Project Settings → API** : noter la *Project URL* et la clé *anon / publishable*
   (cette clé est faite pour être publique ; la sécurité repose sur les règles de `setup.sql`).
6. Renseigner ces deux valeurs dans `index.html`, bloc `OR_CONFIG` en haut du script.

### 2. GitHub Pages
Dépôt → **Settings → Pages** → *Source* : `Deploy from a branch`, branche `main`, dossier `/ (root)`.

## Gérer les utilisateurs
Supabase → **Authentication → Users** :
- **Add user → Create new user** : e-mail + mot de passe, cocher *Auto Confirm User*. Communiquez les identifiants à la personne ;
  elle pourra changer son mot de passe dans le dashboard (bouton « Mot de passe »).
- ou **Invite user** : la personne reçoit un e-mail et choisit elle-même son mot de passe.
- Supprimer un utilisateur lui retire l'accès immédiatement.

« Mot de passe oublié ? » sur l'écran de connexion envoie un lien de réinitialisation.
Le service d'e-mail gratuit de Supabase est limité à quelques e-mails par heure (suffisant pour un petit groupe).

## Limites de l'offre gratuite Supabase
- 1 Go de stockage de fichiers (un match ≈ 70 Ko compressé → plusieurs milliers de matchs), 5 Go de transfert / mois.
- Le projet **se met en pause après 7 jours sans activité** : il se réactive en un clic depuis le tableau de bord Supabase
  (aucune donnée perdue).

## Fichiers de match acceptés
`metadata.json`, `meta.json`, `insight.jsonl`, `physical-summary.jsonl`, `physical-splits.jsonl`, `physical-minute.jsonl`
(un dossier par match conseillé). `tracking-produced.jsonl` n'est pas nécessaire.

Sans configuration Supabase (`OR_CONFIG` vide), le dashboard fonctionne en **mode local** : sans comptes, données dans le navigateur.

Bibliothèques incluses : Chart.js 4.4.1 (MIT), supabase-js 2.45.4 (MIT, `vendor/`).
