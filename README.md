# OR Analysis

Dashboard d'analyse de matchs de football (tracking Second Spectrum + événements Opta), avec comptes utilisateurs.

- **Analyse tactique** : classement, xG, tirs, passes qui cassent la ligne, progression, pressing (PPDA), possessions, récupérations…
- **Physique** : distance, m/min, zones de vitesse, haute intensité, sprints, vitesse max, avec / sans ballon, évolution par 5 min.
- **Filtres** : équipe, journée, match, joueur, quart d'heure.
- **Comptes et rôles** : connexion par e-mail + mot de passe. Une seule base de matchs, partagée :
  - **Master** : ajoute, modifie (journées) et supprime les matchs ;
  - **Lecture** : consulte les dashboards et utilise les filtres, sans pouvoir rien modifier.
  Les droits sont contrôlés par le serveur (règles Supabase), pas seulement masqués dans l'interface.

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

### 2. Fonction « or-admin » (onglet Comptes)
Elle permet aux Masters de créer, modifier et supprimer des comptes depuis le dashboard.
La clé d'administration reste sur le serveur Supabase : elle n'apparaît jamais dans le site.
1. Supabase → **Edge Functions** → **Deploy a new function** → **Via Editor**.
2. Nom : `or-admin` (exactement). Remplacer le code par le contenu de
   [`supabase/functions/or-admin/index.ts`](supabase/functions/or-admin/index.ts) → **Deploy function**.
3. Dans les réglages de la fonction (**Details / Settings**), désactiver **Enforce JWT verification**
   (ou « Verify JWT with legacy secret ») : la fonction vérifie elle-même la session et le rôle Master.

### 3. Premier compte Master
Supabase → **Authentication → Users → Add user → Create new user** (votre e-mail, un mot de passe, *Auto Confirm User*),
puis **SQL Editor** :
```sql
insert into public.masters (user_id)
select id from auth.users where email = 'votre-email@exemple.fr';
```
Tous les autres comptes se gèrent ensuite depuis l'onglet **Comptes** du dashboard.

### 4. GitHub Pages
Dépôt → **Settings → Pages** → *Source* : `Deploy from a branch`, branche `main`, dossier `/ (root)`.

## Gérer les utilisateurs
Dans le dashboard, onglet **Comptes** (visible uniquement par les Masters) :
- **Ajouter un membre** : e-mail + mot de passe provisoire (bouton « Générer ») + rôle **Lecture** ou **Master**.
  Le compte est actif immédiatement ; transmettez les identifiants affichés. Le membre peut changer son mot de passe
  (bouton « Mot de passe » en haut à droite).
- **Changer le rôle** à tout moment via la liste déroulante (pris en compte à la prochaine connexion du membre).
- **Nouveau mot de passe** : génère et affiche un nouveau mot de passe pour un membre.
- **Supprimer** : retire définitivement l'accès.
- Un Master ne peut ni se supprimer ni retirer ses propres droits : il reste toujours au moins un Master.

En secours, tout reste faisable dans Supabase (Authentication → Users, et table `masters` via SQL, voir `setup.sql`).

« Mot de passe oublié ? » sur l'écran de connexion envoie un lien de réinitialisation.
Le service d'e-mail gratuit de Supabase est limité à quelques e-mails par heure (suffisant pour un petit groupe).

## Limites de l'offre gratuite Supabase
- 1 Go de stockage de fichiers (un match ≈ 70 Ko compressé → plusieurs milliers de matchs).
- 5 Go de transfert / mois : chaque compte télécharge la base une fois puis seulement les nouveautés
  (ex. 300 matchs ≈ 21 Mo par nouvel appareil).
- Le projet **se met en pause après 7 jours sans activité** : il se réactive en un clic depuis le tableau de bord Supabase
  (aucune donnée perdue).

## Fichiers de match acceptés
`metadata.json`, `meta.json`, `insight.jsonl`, `physical-summary.jsonl`, `physical-splits.jsonl`, `physical-minute.jsonl`
(un dossier par match conseillé). `tracking-produced.jsonl` n'est pas nécessaire.

Sans configuration Supabase (`OR_CONFIG` vide), le dashboard fonctionne en **mode local** : sans comptes, données dans le navigateur.

Gratuit : Edge Functions jusqu'à 500 000 appels / mois.

Bibliothèques incluses : Chart.js 4.4.1 (MIT), supabase-js 2.45.4 (MIT, `vendor/`).
