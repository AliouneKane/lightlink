# Écrans et parcours utilisateurs

Tâches 23 et 24. La liste complète des écrans de LightLink (web et mobile), puis, pour chaque type d'utilisateur, ce qu'il veut faire et les écrans qu'il traverse. Relevé dans le code le 21 octobre 2026 (branche `feature/phase2-to-main`).

## 1. Les écrans

### Mobile (Expo, 4 onglets)

| Écran | Accès | À quoi il sert |
|---|---|---|
| **Accueil** | Onglet « Accueil » | État du courant dans mon quartier, aperçu de la prévision, raccourcis « Signaler » et « Trouver de l'énergie » / « Partager mon énergie » |
| **Carte** | Onglet « Carte » | Les 10 quartiers pilotes colorés selon leur état, filtre par état, détail d'un quartier |
| **Partage** | Onglet « Partage » | Offres d'énergie (solaire, générateur, batterie) autour d'un quartier, filtres par source |
| **Communauté** | Onglet « Communauté » | Derniers signalements des habitants |
| **Signaler le courant** | Bouton « Signaler » | Choisir le quartier et l'état (« Le courant est coupé », « disponible » ou « instable »), en deux appuis, avec la position si on l'accepte |
| **Votre signalement** | Après l'envoi | Confirmation, et « en attente du réseau » si le téléphone est hors ligne |
| **Prévisions** | Aperçu de l'accueil | Risque de coupure heure par heure, créneau probable, confiance, calendrier ECG avec la question « Avez-vous du courant ? » |
| **Détail d'une offre** | Une offre du Partage | Description, horaires, prix, bouton « Simuler une demande » (« Suspendre mon offre » pour son auteur) |
| **Partager mon énergie** | Accueil, quand j'ai du courant | Publier une offre (source, capacité, prix, créneaux) |
| **Votre offre est prête** | Après la publication | Confirmation et gestion de la disponibilité |
| **Mon espace** | Profil | Nom, quartier, notifications, réinitialisation de la démo |

### Web (Next.js)

| Écran | Adresse | À quoi il sert |
|---|---|---|
| **Tableau de bord** | `/` | Mon quartier, nombre de quartiers sans courant, offres à proximité, carte, prévision, communauté. Sections réorganisables |
| **Carte du réseau** | `/carte` | Carte d'Accra, filtres coupures / énergie, détail d'un quartier |
| **Prévisions** | `/previsions` | Graphique du risque, méthode, calendrier ECG et question « Avez-vous du courant ? », qualité des données |
| **Partager l'énergie** | `/partage` | Offres, demandes en cours |
| **Communauté** | `/communaute` | Signalements récents et quartiers |
| **Paramètres** | `/parametres` | Profil, thème clair ou sombre, réinitialisation |
| Fenêtres | Depuis toutes les pages | Signaler une coupure, publier une offre, compte (inscription et connexion), notifications, aide, réinitialisation |

**Bandeau d'état (web) :** « DÉMO » sans base de données, sinon « CONNEXION… », « EN DIRECT » ou « HORS LIGNE ». Tant que les données en direct manquent, les quartiers sont affichés « État inconnu ».

## 2. Les parcours

### Ama, étudiante à Madina

**Ce qu'elle veut :** savoir si elle pourra réviser ce soir, et prévenir ses voisins quand le courant saute.

| Étape | Ce qu'elle fait | Écran |
|---|---|---|
| 1 | Ouvre l'app : le titre lui dit « Le courant est là. » ou « Coupure à Madina » | Accueil |
| 2 | Touche l'aperçu de la prévision : risque heure par heure et créneau probable | Prévisions |
| 3 | Voit dans le calendrier ECG une coupure annoncée aujourd'hui dans « Parts of Madina » | Prévisions |
| 4 | À 10 h, le courant saute : elle répond « Non, c'est coupé » | Prévisions |
| 5 | Plus tard, le courant revient : « Signaler », puis « Le courant est disponible » | Signaler le courant, puis Votre signalement |
| 6 | Sa réponse colore Madina pour tous les voisins | Carte |

**Ce qui compte pour elle :** deux appuis pour signaler ; ça marche même sans réseau, le signalement part au retour du réseau.

### Kofi, commerçant à Adabraka

**Ce qu'il veut :** ne pas perdre sa journée de vente (frigo, éclairage, paiement mobile) et trouver de l'énergie si la coupure dure.

| Étape | Ce qu'il fait | Écran |
|---|---|---|
| 1 | Le matin, regarde le risque du jour pour Adabraka et sa confiance | Prévisions |
| 2 | Le risque est élevé entre 9 h et 17 h : il recharge ses batteries avant 9 h | Prévisions |
| 3 | La coupure arrive : touche « Trouver de l'énergie » | Accueil |
| 4 | Filtre les offres « Générateur » autour d'Adabraka | Partage |
| 5 | Ouvre l'offre la plus proche, lit le prix et l'horaire, touche « Simuler une demande » | Détail d'une offre |
| 6 | Suit sa demande (« Voir mes demandes »), l'annule si le courant revient | Détail d'une offre, puis Partage |

**Ce qui compte pour lui :** savoir si la coupure est **prévue** par l'ECG (fin annoncée) ou une **surprise**, ce que le détail du quartier indique.

### Akosua, propriétaire d'un générateur à Osu

**Ce qu'elle veut :** rentabiliser son générateur pendant les coupures en le partageant avec ses voisins.

| Étape | Ce qu'elle fait | Écran |
|---|---|---|
| 1 | Voit sur la carte que Labone et Osu sont en coupure | Carte |
| 2 | Touche « Partager mon énergie » | Accueil |
| 3 | Choisit « Générateur », indique la capacité, le prix et les créneaux | Partager mon énergie |
| 4 | Publie : l'offre apparaît pour les voisins | Votre offre est prête |
| 5 | Suspend son offre quand elle est pleine (« Suspendre mon offre »), la réactive ensuite | Détail d'une offre |

**Ce qui compte pour elle :** contrôler la disponibilité ; ne montrer que la distance entre quartiers, jamais son adresse.

## 3. Limites actuelles

- Le **partage d'énergie** reste une démonstration : pas de paiement, offres stockées sur l'appareil.
- Les **comptes** (e-mail et mot de passe) existent sur le web ; le mobile signale avec une session anonyme.
- Les **notifications** sont simulées.
