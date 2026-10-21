# Où l'ECG publie ses horaires de coupure

Tâche 62. La liste des canaux où l'ECG (Electricity Company of Ghana) annonce ses coupures, avec ce que chacun apporte vraiment. Vérifiée le 21 octobre 2026, à partir des collectes de l'équipe ([docs/donnees/SOURCES.csv](donnees/SOURCES.csv)).

## Canaux officiels de l'ECG

| Canal | Lien | Ce qu'on y trouve | Limites |
|---|---|---|---|
| **X (Twitter)** | [@ECGghOfficial](https://x.com/ECGghOfficial) (compte vérifié) | Le canal le plus rapide : maintenances, urgences et pannes, souvent la veille ou le jour même | Détails souvent en **images**. Rarement l'heure de retour du courant |
| **Instagram** | [@ecgghofficial](https://www.instagram.com/ecgghofficial/) | Les mêmes annonces, une publication par semaine et par région (ex. Accra East, 5 au 9 octobre) | Détails uniquement en images |
| **Facebook** | [ECGghOfficial](https://www.facebook.com/ECGghOfficial) | Relaie les annonces (la presse cite parfois ses publications) | Notre agent n'a pu y lire aucune annonce (0 sur 14 jours) |
| **Site web** | [ecg.com.gh](https://www.ecg.com.gh/) | Les grands communiqués, par exemple le [calendrier de délestage de 2023](https://www.ecg.com.gh/images/announcements/ECG_LoadMgt_Schedule.pdf) (PDF, 7 régions, groupes A à D) | Rarement à jour pour les maintenances quotidiennes |

## Presse qui reprend les annonces en texte

Utile quand l'ECG ne publie que des images : la presse recopie souvent les localités.

| Média | Exemple | Ce qu'il apporte |
|---|---|---|
| [MyJoyOnline](https://www.myjoyonline.com/) | [Accra, 12 au 16 oct. 2026](https://www.myjoyonline.com/ecg-to-undertake-maintenance-work-in-parts-of-accra-from-october-12-to-16/) | Localités en texte, par jour |
| [YEN.com.gh](https://yen.com.gh/) | [Accra West, 18 au 23 oct. 2026](https://yen.com.gh/ghana/314007-ecg-announces-6-day-temporary-power-outages-accra-west-due-planned-maintenance-works/) | Localités en texte, par jour |
| [GhanaWeb](https://www.ghanaweb.com/) | [Accra et Tema, 19 au 23 oct. 2026](https://www.ghanaweb.com/GhanaHomePage/NewsArchive/ECG-announces-power-cuts-across-Accra-Tema-from-October-19-2057254) | Résumé, liste partielle |
| [Pulse Ghana](https://www.pulse.com.gh/) | [Accra et Tema, 19 au 23 oct. 2026](https://www.pulse.com.gh/story/ecg-power-outage-accra-tema-october-19-23-2026101813432201398) | Reprend les images de l'ECG |
| [Graphic Online](https://www.graphic.com.gh/) | [Maintenance du 3 juin 2026](https://www.graphic.com.gh/news/general-news/see-the-areas-that-will-be-affected-by-ecgs-planned-maintenance-on-wednesday-june-3-2026.html) | Localités en texte, par région |
| [Adom Online](https://www.adomonline.com/) | [Ogbojo, Botwe, Community 8, 17 oct. 2026](https://www.adomonline.com/ecg-announces-outages-in-ogbojo-botwe-and-community-8/) | Pannes et maintenances, souvent avec la cause |

## Outils tiers

| Outil | Lien | Usage |
|---|---|---|
| 3news Dumsor Timetable | [3news.com/tools/dumsor](https://3news.com/tools/dumsor) | Le groupe de délestage de 2 552 localités (avril 2026). Aucune heure, aucun téléchargement |

## En pratique : la routine de veille

1. **Chaque matin**, regarder le compte X de l'ECG, puis Instagram pour la semaine en cours.
2. Si les localités ne sont qu'en images, chercher la reprise en texte dans la presse (MyJoyOnline, YEN).
3. Chercher nos 10 quartiers pilotes : Osu, Labone, East Legon, Adabraka, Cantonments, Dansoman, Airport Residential, Achimota, Madina, Tema Community 1 (écrit « Comm. 1 » par l'ECG).
4. Recopier chaque annonce trouvée dans [data/saisie/ecg_annonces.csv](../data/saisie/README.md), avec le lien de la publication, et noter la vérification dans le relevé, même quand rien n'est trouvé.

## Ce qu'aucune source ne donne

- **L'heure réelle du retour du courant** : les heures de fin sont des prévisions (Achimota, 4 mai 2025 : 14:00 annoncé, 13:20 réel).
- **Si une annonce a été tenue** : l'ECG ne publie presque jamais d'annulation. C'est ce que mesure la question « Avez-vous du courant ? » de l'app.
- **Une liste complète** : « et zones environnantes » signifie qu'un quartier absent n'est pas forcément épargné.
