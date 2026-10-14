# Décision: Supabase pour le backend (tâche 16)

Date: 14 octobre 2026. Décision prise par Oscar et Salam.

- Choix: **Supabase** (Postgres, authentification, temps réel, règles d'accès par ligne).
- Raison: les signalements, quartiers et horaires ECG sont des données reliées. SQL convient mieux et le temps réel met la carte à jour.
- Sécurité: chaque table a des règles RLS. Un utilisateur ne modifie que ses propres lignes (tâche 73).
- Notifications push: Firebase Cloud Messaging peut rester utilisé plus tard, seulement pour les notifications.
- Mise en place: voir [backend/README.md](../backend/README.md).
