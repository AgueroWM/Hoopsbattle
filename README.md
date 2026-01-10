# Hoops Game Hub

Plateforme événementielle pour le tournoi Hoops Game 2026.

## Setup Rapide

1. `npm install`
2. Copier `.env.example` vers `.env` (demander les clés API à l'admin)
3. `npm run dev`

## Notes Techniques

Le projet utilise Supabase pour le temps réel. Si la connexion échoue, l'app retombe sur les données mockées dans `constants.ts` (utile pour bosser dans le train sans 4G).

### TODOs / Roadmap

- [ ] **Auth**: Sécuriser l'upload de vidéos (actuellement ouvert à tous en dev...)
- [ ] **Performance**: Les images `Unsplash` sont trop lourdes, penser à implémenter un CDN ou optimiser via Next/Image si on migre plus tard.
- [ ] **Mobile**: Le layout du bracket casse un peu sur iPhone SE, à fix.
- [ ] **Clean**: Virer les console.log qui traînent dans `api.ts`.

## Structure

- `/components` : UI pure
- `/services` : Appels API (Supabase wrapper)
- `/lib` : Config clients

---
*Projet maintenu par l'équipe technique Hoops Game.*
