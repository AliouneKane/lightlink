# x: données récupérées sur X (Twitter)

Récoltées le **14 octobre 2026** par un agent IA à partir du prompt [../prompts/PROMPT_AGENT_X.md](../prompts/PROMPT_AGENT_X.md).

| Fichier | Lignes | Contenu |
|---|---|---|
| `ecg_annonces.csv` | 78 | Annonces de l'ECG (@ECGghOfficial), du 8 au 14 octobre 2026. Une ligne par localité |
| `temoignages.csv` | 0 | Témoignages d'habitants: **l'agent n'en a trouvé aucun**, il faudra relancer la recherche |
| `comptes_trouves.csv` | 1 | Un seul compte trouvé: @ECGghOfficial (officiel, vérifié) |

Les fichiers sont tels que rendus par l'agent, sauf un caractère invisible en début de fichier retiré (sinon le premier nom de colonne est mal lu).

## Contenu de `ecg_annonces.csv`

| Publication | Jour des coupures | Lignes | Type |
|---|---|---|---|
| [8 oct., 08:38](https://x.com/ECGghOfficial/status/2108114766266810784) | 8 oct. | 11 | 4 localités en urgence 11h-14h (Dawhenya, Abbeykope, Golden Leaves, Ablekuma), 7 en panne réseau |
| [11 oct., 09:18](https://x.com/ECGghOfficial/status/2109211994658091015) | 12 au 14 oct. (Accra West) | 22 | 8 en urgence le 12 (9h-17h), puis planifiées le 13 et le 14 |
| [11 oct., 09:45](https://x.com/ECGghOfficial/status/2109218705884201194) | 11 oct. | 6 | 5 localités de Tema en urgence 11h-14h, 1 panne à Accra West (Pentecost Junction, route d'Agape) |
| [14 oct., 09:58](https://x.com/ECGghOfficial/status/2110309146545328342) | 14 oct. | 9 | Panne sur le feeder Adesina (région Eastern) |
| [14 oct., 15:06](https://x.com/ECGghOfficial/status/2110386855619314162) | 14 oct. | 29 | Panne « en amont » (Yilo Krobo, Akwamufie, Juapong, etc.) |
| [14 oct., 08:29](https://x.com/ECGghOfficial/status/2110286970668634296) | 14 oct. | 1 | **Incendie au poste de Mallam (GRIDCo)**: une partie d'Accra touchée, courant partiellement rétabli. Les quartiers ne sont pas listés |

## Points d'attention avant d'importer

1. **Le 12 octobre est « urgence » sur X mais « planifiée » dans la presse** (MyJoyOnline). Dans le fichier de l'agent, ces 8 lignes sont en `emergency`; à vérifier sur la publication.
2. **La colonne `region_ecg` n'est pas fiable** pour les pannes en amont: des localités comme Yilo Krobo, Juapong ou Akosombo-Senchi sont classées « Tema » alors qu'elles sont en dehors du Grand Accra. Elles sont à exclure de la carte d'Accra.
3. **Les 5 et 8 octobre** (Accra East et Tema, 6 images) et **les 12 au 16 octobre pour l'Est d'Accra, Tema, Volta et Eastern** (une vingtaine d'images) **ne sont pas dans ce fichier.** Seul Accra West du 12 au 14 y est. Les 15 et 16 octobre d'Accra West sont dans `../ecg/ecg_pannes_planifiees_2026.csv` (source: presse).
4. **« et zones environnantes »** (colonne `remarque`): la liste n'est pas complète. Un quartier absent ne veut pas dire qu'il n'est pas coupé.
5. **Pas d'heure de fin de panne**: aucune ligne ne donne l'heure de retour du courant (`heure_restauration` vide partout), donc pas de durée réelle pour la prédiction.
6. **Hors périmètre pilote:** aucune de nos 10 zones pilotes (Osu, Labone, East Legon, etc.) n'apparaît dans ces 78 lignes, sauf peut-être via « Ablekuma » (non pilote). Pour les tester avec des vraies données, il faudra plus de semaines d'annonces (voir le prompt de relance).

---

## Ajout: annonces de 2025 (récolte du 14 octobre 2026)

| Fichier | Lignes | Contenu |
|---|---|---|
| `ecg_annonces_2025.csv` | 64 | Annonces de l'ECG de mars à mai 2025 |
| `temoignages_2025.csv` | 0 | Aucun témoignage trouvé |
| `comptes_trouves_2025.csv` | 1 | @ECGghOfficial |

Même colonnes que `ecg_annonces.csv`. Les deux fichiers peuvent être chargés dans la même table.

| Publication | Jour | Lignes | Événement |
|---|---|---|---|
| [22 mars 2025, 09:24](https://x.com/ECGghOfficial/status/1903377345232179283) | 21 mars | 4 | Panne de transformateur à Ability (Accra East) |
| [22 mars 2025, 10:24](https://x.com/ECGghOfficial/status/1903392295371583706) | 22 mars | 6 | Panne sur le feeder Twumasewaa (Ogbojo, Otienshie…), retour prévu à 14:00 |
| [26 mars 2025, 06:40](https://x.com/ECGghOfficial/status/1904785402487017859) | 25 mars | 1 | Tempête de pluie, « parties d'Accra », sans liste |
| [4 mai 2025, 13:04](https://x.com/ECGghOfficial/status/1919015253909643770) | 4 mai | 14 | **Incendie au poste d'Achimota (BSP)**: Achimota, Adabraka, Kaneshie, Kokomlemle, Circle, Nima, Asylum Down, etc. Retour annoncé à 14:00 |
| [15 mai 2025, 09:25](https://x.com/ECGghOfficial/status/1922946329862402550) | 18 mai | 24 | Maintenance GRIDCo au poste de Mallam (Odorkor, Dansoman, Weija, Gbawe, etc.), 9h-16h |
| [23 mai 2025, 14:27](https://x.com/ECGghOfficial/status/1925921593970114717) | 25 mai | 15 | Maintenance GRIDCo au poste de Kasoa, 9h-16h |

## Ce que ça apporte et attention

- **Zones pilotes touchées:** Achimota et Adabraka (4 mai 2025), Dansoman (18 mai 2025).
- **Premiers retours du courant annoncés** (colonnes `restauration` et `heure_restauration`): 20 lignes ont une heure de retour. Ce sont les seules durées estimées de tous nos fichiers, donc utiles pour la prédiction.
- **Une seule grosse panne est liée à un poste** (Achimota BSP le 4 mai 2025, Mallam BSP le 14 octobre 2026): une panne de poste coupe beaucoup de quartiers à la fois. La base de données devrait pouvoir relier une annonce à une **cause** commune (voir [la modélisation](../../MODELISATION_BASE_DE_DONNEES.md)).
- **Couverture très partielle:** l'agent a trouvé 6 publications sur toute l'année 2025. Ce n'est pas un historique complet, seulement des exemples.
- **Une date à vérifier:** le fichier contient `date_coupure` 2025-03-21 pour un post publié le 22 mars (la date vient de l'image).
- **Lignes en désordre** (mars, mai, puis mars): sans importance, la date est dans chaque ligne.
- **Région vide pour Kasoa** (25 mai): Kasoa est dans la région Centrale, pas dans le Grand Accra.
