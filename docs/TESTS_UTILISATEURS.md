# Test du prototype auprès de 3 personnes hors équipe

Tâche 30. Protocole prêt à suivre : 20 minutes par personne, sur le téléphone de la personne ou un ordinateur. Le but est de voir **où les gens bloquent**, pas de leur expliquer l'app.

## Avant le test

- **Qui :** 3 personnes qui ne connaissent pas le projet, si possible un étudiant, un commerçant et quelqu'un qui a un générateur, un panneau solaire ou une batterie (les trois profils de [PARCOURS_ET_ECRANS.md](PARCOURS_ET_ECRANS.md)).
- **Quoi :** le site web (lien Vercel, ou `npm run dev` dans `web/`) ou l'app mobile dans Expo Go.
- **Accord :** dire que c'est un prototype, que rien n'est payant, et demander si on peut noter leurs remarques (sans leur nom).
- **Matériel :** une copie de la fiche ci-dessous par personne.

## Pendant le test

Dire seulement : « Imagine que tu vis à Accra et que le courant coupe souvent. Fais ces tâches, et dis à voix haute ce que tu penses. » Ne pas aider, sauf si la personne est bloquée plus d'une minute (le noter).

| # | Tâche à donner | Réussite si… |
|---|---|---|
| 1 | « Choisis ton quartier : Madina. » | Le profil indique Madina |
| 2 | « Dis à l'app que le courant est coupé chez toi. » | Le signalement est envoyé, en 2 ou 3 appuis |
| 3 | « Y a-t-il un risque de coupure aujourd'hui ? À quelle heure ? » | La personne trouve l'écran Prévisions et lit le créneau |
| 4 | « L'ECG a-t-il annoncé une coupure ? Réponds à sa question. » | Elle répond à « Avez-vous du courant ? » |
| 5 | « Trouve quelqu'un qui partage de l'énergie près de chez toi. » | Elle ouvre une offre et simule une demande |
| 6 | « Tu as un générateur : propose ton énergie. » | Elle publie une offre |

## Après le test : 4 questions

1. Qu'est-ce qui t'a le plus servi ?
2. Qu'est-ce qui t'a perdu ou agacé ?
3. Sur 10, à quel point ferais-tu confiance à la prévision ? Pourquoi ?
4. L'utiliserais-tu chez toi ? Qu'est-ce qui te manque pour ça ?

## Fiche de remarques (une par personne)

```
Personne : 1 / 2 / 3     Profil : ____________     Appareil : téléphone / ordinateur
Date : __________        Testé par : Rama

Tâche | Réussie (oui / avec aide / non) | Temps | Ce qui a bloqué
1     |                                 |       |
2     |                                 |       |
3     |                                 |       |
4     |                                 |       |
5     |                                 |       |
6     |                                 |       |

Réponses aux 4 questions :
1.
2.
3.
4.

Phrase marquante (mot pour mot) :
```

## Après les 3 tests

Regrouper les remarques dans une issue GitHub « Retours des tests utilisateurs ». Pour chaque problème vu au moins 2 fois, indiquer l'écran et proposer une correction à PAN. Une phrase marquante peut servir dans la vidéo et le pitch.
