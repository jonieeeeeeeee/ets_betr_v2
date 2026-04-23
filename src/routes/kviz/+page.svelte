<script>
  import Nav from '$lib/Nav.svelte';
  import { loadQuestions, META, shuffle, checkAnswer } from '$lib/questions.js';

  let phase = 'setup';
  let selTest = 'A', selCount = 10;
  let questions = [], answers = [], statuses = [], idx = 0;

  async function start() {
    const raw = await loadQuestions(selTest);
    questions = shuffle(raw).slice(0, Math.min(selCount, raw.length));
    answers = Array(questions.length).fill(null);
    statuses = Array(questions.length).fill(null);
    idx = 0; phase = 'quiz';
  }

  $: q = questions[idx];
  $: checked = statuses[idx];
  $: isLast = idx === questions.length - 1;

  function pick(oi) {
    if (statuses[idx] !== null) return;
    if (q.type === 'multi') {
      const cur = Array.isArray(answers[idx]) ? [...answers[idx]] : [];
      const i = cur.indexOf(oi);
      i === -1 ? cur.push(oi) : cur.splice(i, 1);
      answers[idx] = cur.length ? cur : null;
    } else {
      answers[idx] = [oi];
    }
    // Force Svelte to detect change
    answers = answers;
  }

  function check() {
    if (statuses[idx] !== null) return;
    if (!answers[idx]?.length) { alert('Najprv označ odpoveď!'); return; }
    statuses[idx] = checkAnswer(q, answers[idx]);
    statuses = statuses;
  }

  function next() {
    if (statuses[idx] === null) { alert('Najprv skontroluj!'); return; }
    idx++;
  }

  function finish() {
    if (!statuses.every(s => s !== null)) { alert('Skontroluj všetky otázky!'); return; }
    phase = 'results';
  }

  function letter(a) {
    if (!a?.length) return '—';
    return a.map(x => String.fromCharCode(65 + x)).join(', ');
  }

  $: correctCount = statuses.filter(Boolean).length;
  $: pct = questions.length ? Math.round(correctCount / questions.length * 100) : 0;
</script>

<svelte:head><title>🎯 Kvíz | ELTEC</title></svelte:head>

<div class="min-h-screen">
  <Nav>
    <h1 class="text-3xl font-extrabold animated-title mb-1">🎯 Strel odpoveď!</h1>
    <p class="text-slate-400 text-sm">Označ odpovede a klikni Skontrolovať</p>
  </Nav>

  <main class="max-w-xl mx-auto px-5 py-8">

    {#if phase === 'setup'}
      <div class="bg-slate-800/60 border border-slate-700/50 rounded-3xl p-8 text-center space-y-5">
        <h2 class="text-2xl font-bold">Výber kvízu</h2>
        <label class="block text-left">
          <span class="text-sm font-semibold text-slate-300 block mb-1.5">📘 Test</span>
          <select bind:value={selTest}
            class="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-500">
            {#each Object.entries(META) as [k, m]}
              <option value={k}>{m.emoji} {m.name}</option>
            {/each}
          </select>
        </label>
        <label class="block text-left">
          <span class="text-sm font-semibold text-slate-300 block mb-1.5">🔢 Počet otázok</span>
          <input type="number" bind:value={selCount} min="1" max="50"
            class="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-500" />
        </label>
        <button on:click={start}
          class="w-full py-3 rounded-full bg-blue-500 hover:bg-blue-600 text-white font-bold transition-colors">
          🚀 Spustiť
        </button>
      </div>

    {:else if phase === 'quiz' && q}
      <div class="h-1 bg-slate-800 rounded-full mb-5 overflow-hidden">
        <div class="h-full bg-emerald-500 transition-all rounded-full" style="width:{(idx+1)/questions.length*100}%"></div>
      </div>

      <div class="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6 mb-4">
        <div class="flex justify-between text-xs mb-4 flex-wrap gap-2">
          <span class="bg-blue-500 text-white px-3 py-1 rounded-full font-bold">{idx+1}/{questions.length}</span>
          <span class="bg-slate-700 text-slate-300 px-3 py-1 rounded-full">{q.type==='multi'?'✅ Viac správnych':'🔘 Jedna správna'}</span>
        </div>
        <p class="font-bold leading-snug mb-5">{q.question}</p>

        <div class="space-y-2">
          {#each q.options as opt, oi (oi)}
            <button
              on:click={() => pick(oi)}
              disabled={checked !== null}
              class="opt-row w-full text-left"
              class:opt-selected={Array.isArray(answers[idx]) && answers[idx].includes(oi) && checked === null}
              class:opt-correct={checked !== null && q.correct.includes(oi)}
              class:opt-wrong={checked !== null && Array.isArray(answers[idx]) && answers[idx].includes(oi) && !q.correct.includes(oi)}
            >
              {#if q.type === 'multi'}
                <span class="chk" class:chk-on={Array.isArray(answers[idx]) && answers[idx].includes(oi)}>
                  {Array.isArray(answers[idx]) && answers[idx].includes(oi) ? '✓' : ''}
                </span>
              {:else}
                <span class="radio" class:radio-on={Array.isArray(answers[idx]) && answers[idx].includes(oi)}>
                  {String.fromCharCode(65 + oi)}
                </span>
              {/if}
              <span class="text-sm">{String.fromCharCode(65 + oi)}) {opt}</span>
            </button>
          {/each}
        </div>

        {#if checked !== null}
          <div class="mt-4 rounded-xl p-4" class:result-ok={checked} class:result-fail={!checked}>
            <p class="font-bold" class:text-emerald-400={checked} class:text-red-400={!checked}>
              {checked ? '✓ Správne!' : '✗ Nesprávne'}
            </p>
            <p class="text-sm text-slate-400 mt-1">Tvoja: {letter(answers[idx])}</p>
            {#if !checked}
              <p class="text-sm text-emerald-400 mt-0.5">
                Správna: {q.correct.map(c => String.fromCharCode(65+c)).join(', ')}) {q.correct.map(c => q.options[c]).join('; ')}
              </p>
            {/if}
          </div>
        {/if}
      </div>

      <div class="flex gap-2.5 flex-wrap">
        <button on:click={() => idx--} disabled={idx === 0}
          class="flex-1 py-2.5 rounded-full font-semibold bg-slate-700 hover:bg-slate-600 disabled:opacity-40 transition-colors">
          ◀ Späť
        </button>
        <button on:click={check} disabled={checked !== null}
          class="flex-1 py-2.5 rounded-full font-semibold bg-amber-500 hover:bg-amber-600 text-white disabled:opacity-40 transition-colors">
          ✅ Skontrolovať
        </button>
        {#if !isLast}
          <button on:click={next}
            class="flex-1 py-2.5 rounded-full font-semibold bg-blue-500 hover:bg-blue-600 text-white transition-colors">
            Ďalšia ▶
          </button>
        {:else if checked !== null}
          <button on:click={finish}
            class="flex-1 py-2.5 rounded-full font-semibold bg-emerald-500 hover:bg-emerald-600 text-white transition-colors">
            🏁 Ukončiť
          </button>
        {/if}
      </div>

    {:else if phase === 'results'}
      <div class="bg-slate-800/60 border border-slate-700/50 rounded-3xl p-8 text-center mb-5">
        <h2 class="text-2xl font-bold mb-3">📊 Výsledky</h2>
        <p class="text-5xl font-extrabold" style="color:{pct>=90?'#10b981':pct>=75?'#3b82f6':pct>=50?'#f59e0b':'#ef4444'}">
          {correctCount}/{questions.length}
        </p>
        <p class="text-slate-400 mt-1">({pct}%)</p>
        <button on:click={() => phase='setup'}
          class="mt-5 px-8 py-2.5 rounded-full bg-blue-500 hover:bg-blue-600 text-white font-semibold transition-colors">
          🔄 Nový kvíz
        </button>
      </div>
      <div class="space-y-2.5">
        {#each questions as qr, i}
          <div class="rounded-xl p-3.5 bg-slate-800/60 border-l-4"
            class:border-emerald-500={statuses[i]} class:border-red-500={!statuses[i]}>
            <p class="font-semibold text-sm">{i+1}. {qr.question}</p>
            <p class="text-xs text-slate-400 mt-1">Tvoja: {letter(answers[i])}</p>
            <p class="text-xs text-emerald-400">Správna: {qr.correct.map(c => String.fromCharCode(65+c)).join(', ')}</p>
          </div>
        {/each}
      </div>
    {/if}

  </main>
</div>

<style>
  .animated-title {
    background: linear-gradient(90deg, #f1f5f9, #60a5fa, #818cf8, #60a5fa, #f1f5f9);
    background-size: 200% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    animation: shimmer 4s linear infinite;
  }
  @keyframes shimmer {
    0%   { background-position: 0% center; }
    100% { background-position: 200% center; }
  }

  .opt-row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    border-radius: 12px;
    border: 2px solid rgba(71, 85, 105, 0.5);
    background: rgba(51, 65, 85, 0.4);
    cursor: pointer;
    transition: border-color 0.15s, background 0.15s;
  }
  .opt-row:hover:not(:disabled) { border-color: #64748b; }
  .opt-row:disabled { cursor: default; }

  .opt-selected {
    background: rgba(59, 130, 246, 0.25) !important;
    border-color: #3b82f6 !important;
  }
  .opt-correct {
    background: rgba(16, 185, 129, 0.2) !important;
    border-color: #10b981 !important;
  }
  .opt-wrong {
    background: rgba(239, 68, 68, 0.2) !important;
    border-color: #ef4444 !important;
  }

  .chk {
    width: 20px; height: 20px; flex-shrink: 0;
    border-radius: 5px;
    border: 2px solid #64748b;
    display: flex; align-items: center; justify-content: center;
    font-size: 11px; font-weight: bold;
    transition: all 0.15s;
  }
  .chk-on { background: #3b82f6; border-color: #3b82f6; color: white; }

  .radio {
    width: 28px; height: 28px; flex-shrink: 0;
    border-radius: 50%;
    background: #475569;
    display: flex; align-items: center; justify-content: center;
    font-size: 11px; font-weight: bold;
    transition: all 0.15s;
  }
  .radio-on { background: #3b82f6; color: white; }

  .result-ok   { background: rgba(16,185,129,0.1); border-left: 4px solid #10b981; }
  .result-fail { background: rgba(239,68,68,0.1);  border-left: 4px solid #ef4444; }
</style>
