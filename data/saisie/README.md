# saisie: annonces ECG recopiées à la main

Tâche 64. Quand l'ECG annonce une coupure dans un de nos 10 quartiers pilotes, on la recopie ici. Elle apparaît alors dans le calendrier ECG de l'app et fait monter la prévision du jour annoncé. L'import quotidien (GitHub Actions) l'envoie dans la base.

Ces lignes ne servent **pas** à estimer le risque habituel des quartiers : une saisie à la main n'est pas une surveillance complète, donc un jour sans saisie ne prouve pas qu'il n'y a pas eu de coupure.

## Où chercher les annonces

Voir [docs/SOURCES_HORAIRES_ECG.md](../../docs/SOURCES_HORAIRES_ECG.md). En pratique : le compte X de l'ECG, puis sa page Instagram, puis la presse (MyJoyOnline, Pulse, YEN, GhanaWeb), chaque matin.

## Comment saisir une annonce

1. Ouvrez `ecg_annonces.csv` (Excel, Numbers ou Google Sheets, puis enregistrez en **CSV UTF-8**).
2. Ajoutez **une ligne par localité citée**, en recopiant le nom exactement comme l'ECG l'écrit (par exemple `Parts of Madina`).
3. Remplissez les colonnes :

| Colonne | Quoi mettre | Exemple |
|---|---|---|
| `date_coupure` | Jour de la coupure, AAAA-MM-JJ | `2026-10-27` |
| `region_ecg` | Région ECG indiquée | `Accra East` |
| `localite` | Nom exact dans l'annonce | `Parts of Madina` |
| `heure_debut`, `heure_fin` | Heures annoncées, HH:MM (heure du Ghana) | `09:00`, `17:00` |
| `type` | `planned` (maintenance), `emergency` (urgence) ou `fault` (panne) | `planned` |
| `groupe` | Groupe de délestage, si l'annonce le donne, sinon vide | |
| `motif` | Raison donnée | `planned maintenance` |
| `restauration`, `heure_restauration` | `non` et vide, sauf si l'ECG annonce le retour du courant | `non` |
| `date_publication`, `heure_publication` | Quand l'annonce a été publiée | `2026-10-25`, `18:30` |
| `compte` | Qui l'a publiée | `ECG sur X (@ECGghOfficial)` |
| `url_post` | Lien de la publication (obligatoire) | |
| `source_type` | `texte` ou `image` | `image` |
| `remarque` | Par exemple « et zones environnantes » | |

4. Ne recopiez **que** ce que l'ECG a publié, jamais une heure supposée. Sans heure de début et de fin, la ligne est ignorée.
5. Vérifiez, puis ouvrez une PR :

```sh
python3 prediction/import_schedules.py | grep -i madina   # la nouvelle fenêtre doit apparaître
python3 -m unittest discover -s prediction/tests
```

## Relevé des vérifications

| Date du relevé | Période couverte | Sources lues | Résultat pour les quartiers pilotes |
|---|---|---|---|
| 21 oct. 2026 | 18 au 23 oct. 2026 | [YEN, Accra West, 18-23 oct.](https://yen.com.gh/ghana/314007-ecg-announces-6-day-temporary-power-outages-accra-west-due-planned-maintenance-works/), [GhanaWeb, 19-23 oct.](https://www.ghanaweb.com/GhanaHomePage/NewsArchive/ECG-announces-power-cuts-across-Accra-Tema-from-October-19-2057254), [Pulse, 19-23 oct.](https://www.pulse.com.gh/story/ecg-power-outage-accra-tema-october-19-23-2026101813432201398), [Adom, 17 oct.](https://www.adomonline.com/ecg-announces-outages-in-ogbojo-botwe-and-community-8/) | **Aucune annonce trouvée.** Accra West touche Darkuman, Anyaa, Gbawe, Medie, etc., aucun quartier pilote. **À compléter :** le détail d'Accra East et de Tema n'est publié qu'en images (Pulse, X de l'ECG) ; il faut les lire pour Madina, East Legon et Tema Community 1 |
