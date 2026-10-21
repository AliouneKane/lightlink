# Qualité, performances et sécurité

Tâches 102, 122 et 129 à 133. Mesures faites le 21 octobre 2026 sur un MacBook Apple M3 et sur le projet Supabase hébergé. Pour relancer chaque mesure, voir la colonne « Commande ».

## Performances

| Mesure | Résultat | Limite visée | Commande |
|---|---|---|---|
| Calcul des 10 prévisions (122) | 32 ms | 2 s | test `Speed`, `python3 -m unittest discover -s prediction/tests` |
| Lecture de l'état des quartiers et des prévisions par l'app (122) | 170 ms | 2 s | `npm run test:live` (backend) |
| 100 signalements d'un coup, avec les contrôles de chaque signalement (131) | 11 ms | 2 s | `npm run test:load` (backend, projet relié) |
| Lecture de la carte juste après ces 100 signalements (131) | moins de 1 ms | 0,5 s | idem |
| Site web en 3G lente, 400 kbit/s et 400 ms de latence (129) | contenu visible en 0,6 s, page complète en 15,6 s | | navigateur avec réseau simulé |
| Site web en 3G rapide (129) | contenu visible en 0,2 s, page complète en 4,4 s | | idem |

**Limites de ces mesures** : le test de charge envoie les 100 signalements depuis la base elle-même (marqués simulés, puis supprimés) ; il ne simule pas 100 téléphones sur le réseau. Les signalements simulés ne déclenchent pas d'alerte.

## Sans réseau et réseau lent (129)

| Situation | Comportement | Vérifié par |
|---|---|---|
| Mobile sans réseau | Le signalement est gardé sur le téléphone avec son heure d'observation et un identifiant unique, puis envoyé au retour du réseau ; jamais en double | Tests de la file (`mobile/src/lib/report-queue.test.ts`), `test:sql` |
| Web sans réseau | Fond de carte absent mais quartiers et signalement utilisables ; message clair si l'envoi échoue | Parcours navigateur « offline tiles… » |
| Base injoignable | Badge « HORS LIGNE », quartiers en « État inconnu », jamais d'état inventé | Vérifié dans un navigateur |

## Poids et données (130)

| Mesure | Résultat |
|---|---|
| Code de l'app Android compilé (Hermes) | 5,8 Mo |
| Images et polices embarquées | 2,0 Mo |
| Site web, première visite | 391 Ko transférés |
| Données par rafraîchissement en mode connecté (état, horaires ECG, prévisions, offres) | 3,4 Ko compressés, soit environ 200 Ko par heure d'utilisation continue (rafraîchissement chaque minute) |

Le poids de l'APK final n'est pas encore mesuré : il ajoute le moteur natif de React Native et demande une compilation EAS (compte Expo).

## Secrets (132)

- Recherche sur **tout l'historique Git** (67 commits, toutes les branches) : **aucun** fichier `.env`, clé secrète Supabase, jeton, mot de passe de base ou clé privée.
- `web/.env.local`, `mobile/.env` et `backend/supabase/.temp/` sont ignorés par Git.
- Les apps n'utilisent que la clé **publique** (publishable). Le mot de passe de la base n'existe que dans les secrets GitHub (`SUPABASE_DB_URL`).
- Le CI lance gitleaks sur tout l'historique à chaque pull request.

## Failles des dépendances (133)

`npm audit` le 21 octobre 2026 :

| Projet | Résultat | Dans ce qui est livré ? |
|---|---|---|
| Backend | 0 faille | — |
| Web | 5 alertes « high », toutes dans l'outil de vérification du code (`eslint-config-next`) | **Non** : 0 faille dans les dépendances de production |
| Mobile | 22 alertes, issues de **3 failles** seulement | Voir ci-dessous |

Les 3 failles mobiles :

| Paquet | Faille | Où il sert | Décision |
|---|---|---|---|
| `braces` 3.0.3 | Blocage par motif de fichiers très imbriqué | Outils de compilation (Metro) sur l'ordinateur du développeur | Pas de version corrigée publiée ; aucun risque pour les habitants |
| `node-forge` 1.4.0 | Vérification de signature RSA trop permissive | Outil Expo de signature des mises à jour, sur l'ordinateur | Pas de version corrigée publiée ; LightLink n'utilise pas les mises à jour signées |
| `decode-uri-component` 0.2.2 (modérée) | Blocage par un lien mal encodé | Lecture des liens par `expo-router`, **dans l'app** | Risque faible (un lien piégé ferait au pire planter l'app chez celui qui l'ouvre). La correction exige expo-router 58, donc le SDK Expo 58 : à faire après la soumission. La PR Dependabot #3 propose ce saut de version et casse le contrôle de compatibilité du SDK 57 : **à fermer** |

Les « corrections » proposées par `npm audit` (Expo 44, React Native 0.72, Next.js 14) sont des **retours en arrière** de plusieurs années : à ne pas appliquer.

## Sécurité et vie privée (102)

Vérifié par `npm run test:sql` avec les vrais rôles de Supabase, et par `npm run test:live` sur le projet hébergé :

- Personne ne signale au nom d'un autre, ni sans session ; 5 signalements au plus en 10 minutes ; une position à plus de 5 km du quartier est refusée.
- Personne ne modifie les données d'un autre (signalements, profils, offres) ; seuls l'import et le script de démo écrivent les horaires, prévisions et signalements simulés.
- L'adresse exacte d'une offre n'est visible que par l'hôte et les demandeurs acceptés ; les demandes, les profils et les notifications sont privés.
- Les signalements d'abus ne sont lisibles que par l'équipe.
- La position GPS d'un signalement n'est jamais montrée aux autres habitants.
