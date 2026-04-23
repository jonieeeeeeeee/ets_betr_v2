# ELTEC Certifikačný systém — Svelte + Tailwind

## Inštalácia a spustenie

```bash
npm install
npm run dev
```

## Build pre produkciu (Vercel)

```bash
npm run build
```

Vercel automaticky deteguje SvelteKit — stačí len pushnúť repozitár.

## Štruktúra

```
src/
├── lib/
│   ├── questions.js     ← databáza otázok (upravuj tu)
│   ├── theme.js         ← dark/light toggle store
│   └── Nav.svelte       ← zdieľaná navigácia
└── routes/
    ├── +layout.svelte   ← globálny layout
    ├── +page.svelte     ← hlavná stránka (výber testov)
    ├── test/            ← testovanie s časovačom
    ├── kviz/            ← kvíz "Strel odpoveď"
    └── spravne-odpovede/← prehľad odpovedí + PDF manažér
```

## Pridanie otázky

Otvor `src/lib/questions.js` a pridaj objekt do príslušného poľa (A/B/C/D/LEG):

```js
{
  id: "A_33", chapter: "A",
  question: "Tvoja otázka?",
  options: ["možnosť A", "možnosť B", "možnosť C"],
  correct: [0],       // index správnej odpovede (môže byť viac: [0,2])
  type: "single"      // alebo "multi"
}
```
