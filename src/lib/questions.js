// Loads question JSON files from /data/questions_X.json
// Each file is served as a static asset from the /static/data/ folder.

export const CHAPTERS = ['A', 'B', 'C', 'D', 'LEG'];

export const META = {
  A:   { name: 'Test A — Merania',       time: 40, desc: 'Elektrotechnické merania, bleskozvody, izolácia, uzemnenie', emoji: '🔧' },
  B:   { name: 'Test B — Ochrany',       time: 35, desc: 'Meranie ochrán, siete TT/TN, chrániče, uzemnenie',           emoji: '⚡' },
  C:   { name: 'Test C — Bezpečnosť',    time: 50, desc: 'Bezpečnostné predpisy, PPN, príkazy B, ochranné pomôcky',    emoji: '👷' },
  D:   { name: 'Test D — Prvá pomoc',    time: 25, desc: 'Oživovanie, krvácanie, popáleniny, stabilizovaná poloha',    emoji: '🩺' },
  LEG: { name: 'Legislatíva',            time: 50, desc: 'Vyhláška 508/2009, TI, IBP, odborná spôsobilosť',            emoji: '⚖️' },
};

const cache = {};

export async function loadQuestions(chapter) {
  if (cache[chapter]) return cache[chapter];
  const res = await fetch(`/data/questions_${chapter}.json`);
  cache[chapter] = await res.json();
  return cache[chapter];
}

export async function loadAll(chapters = CHAPTERS) {
  const results = await Promise.all(chapters.map(c => loadQuestions(c)));
  return chapters.reduce((acc, c, i) => ({ ...acc, [c]: results[i] }), {});
}

export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function scoreColor(pct) {
  return pct >= 90 ? '#10b981' : pct >= 75 ? '#3b82f6' : pct >= 50 ? '#f59e0b' : '#ef4444';
}

export function scoreMsg(pct) {
  return pct >= 90 ? 'Výborný! 🎉' : pct >= 75 ? 'Dobrý! 👍' : pct >= 50 ? 'Priemerný 📊' : 'Treba viac trénovať 📚';
}

export function checkAnswer(q, ans) {
  if (!ans?.length) return false;
  if (q.type === 'single') return ans.length === 1 && ans[0] === q.correct[0];
  return ans.length === q.correct.length &&
    [...ans].sort().every((v, i) => v === [...q.correct].sort()[i]);
}
