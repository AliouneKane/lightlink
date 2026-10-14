# nline: les mesures des capteurs (données historiques)

**nLine** est une entreprise issue de l'université de Berkeley. Elle a posé des capteurs branchés sur des prises électriques à Accra. Ils mesurent la tension et la fréquence du courant toutes les **2 minutes**. C'est la mesure **indépendante de l'ECG**.

## Ce que contient le jeu de données public

- Plus de **1 300 capteurs GridWatch** à Accra, sur environ **4 ans**.
- Des mesures brutes: tension et fréquence.
- Des indicateurs calculés: **SAIDI** (durée moyenne des coupures par client), **SAIFI** (nombre moyen de coupures par client) et heures de sous-tension.
- Les coupures détectées.

## Où le trouver

| Quoi | Lien |
|---|---|
| Tableau de bord pour voir et télécharger | http://data.powerwatch.io/ (un Grafana qui demande peut-être un compte) |
| Annonce de la publication | https://blog.nline.io/smart-grids |
| Contact pour la licence et l'accès | info@nline.io |
| Projet de recherche | https://cega.berkeley.edu/collection/gridwatch/ |

## Pourquoi aucun fichier ici

- Le jeu de données se télécharge **par le tableau de bord**, il n'y a pas de fichier direct trouvé.
- **Aucune licence n'est indiquée** sur la page. Il faut écrire à nLine avant de réutiliser les données ou de les mettre dans un dépôt public.
- Les noms exacts des colonnes ne sont pas publiés sur la page. Ils sont à relever après l'export.

**À faire** (tâche pour Oscar): demander l'accès à nLine, exporter un échantillon (quelques semaines pour nos 10 quartiers) et le ranger ici dans `nline/echantillon/`.

## Comment ça servira

Pour la prédiction, ces mesures donnent l'**historique réel**: à quelle heure et quel jour les coupures arrivent, et combien de temps elles durent, par zone d'Accra. C'est le bloc C du document de projet.
