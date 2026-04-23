<script>
  import Nav from '$lib/Nav.svelte';
  import { loadQuestions, META, shuffle, checkAnswer } from '$lib/questions.js';

  let phase = 'setup'; // setup | quiz | results
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
    if (checked !== null) return;
    if (q.type === 'multi') {
      const cur = Array.isArray(answers[idx]) ? [...answers[idx]] : [];
      const i = cur.indexOf(oi); i === -1 ? cur.push(oi) : cur.splice(i, 1);
      answers[idx] = cur.length ? cur : null;
    } else {
      answers[idx] = oi;
    }
    answers = [...answers];
  }

  function sel(oi) {
    const a = answers[idx];
    return Array.isArray(a) ? a.includes(oi) : a === oi;
  }

  function check() {
    if (checked !== null) return alert('Už skontrolované!');
    const a = answers[idx];
    if (a === null || (Array.isArray(a) && !a.length)) return alert('Najprv označ odpoveď!');
    statuses[idx] = checkAnswer(q, Array.isArray(a) ? a : [a]);
    statuses = [...statuses];
  }

  function next() {
    if (checked === null) return alert('Najprv skontroluj!');
    idx++;
  }

  function finish() {
    if (!statuses.every(s => s !== null)) return alert('Skontroluj všetky otázky!');
    phase = 'results';
  }

  function letter(a) {
    if (a === null || a === undefined) return '—';
    return Array.isArray(a) ? a.map(x => String.fromCharCode(65+x)).join(', ') : String.fromCharCode(65+a);
  }

  $: correctCount = statuses.filter(Boolean).length;
  $: pct = questions.length ? Math.round(correctCount/questions.length*100) : 0;
</script>

<svelte:head><title>🎯 Kvíz | ELTEC</title></svelte:head>

<div class="min-h-screen bg-slate-950 text-slate-100">
  <Nav>
    <h1 class="text-3xl font-extrabold bg-gradient-to-r from-slate-100 to-blue-400 bg-clip-text text-transparent mb-1">🎯 Strel odpoveď!</h1>
    <p class="text-slate-400 text-sm">Označ odpovede a klikni Skontrolovať</p>
  </Nav>

  <main class="max-w-xl mx-auto px-5 py-8">

    <!-- Setup -->
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

    <!-- Quiz -->
    {:else if phase === 'quiz' && q}
      <div class="h-1 bg-slate-800 rounded-full mb-5 overflow-hidden">
        <div class="h-full bg-emerald-500 transition-all rounded-full" style="width:{idx/questions.length*100}%"></div>
      </div>

      <div class="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6 mb-4">
        <div class="flex justify-between text-xs mb-4 flex-wrap gap-2">
          <span class="bg-blue-500 text-white px-3 py-1 rounded-full font-bold">{idx+1}/{questions.length}</span>
          <span class="bg-slate-700 text-slate-300 px-3 py-1 rounded-full">{q.type==='multi'?'✅ Viac správnych':'🔘 Jedna správna'}</span>
        </div>
        <p class="font-bold leading-snug mb-5">{q.question}</p>

        <div class="space-y-2">
          {#each q.options as opt, oi}
            <div on:click={() => pick(oi)} role="button" tabindex="0" on:keydown={e=>e.key==='Enter'&&pick(oi)}
              class="flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all text-sm
                {checked !== null && q.correct.includes(oi) ? 'bg-emerald-500/20 border-emerald-500'
                : checked !== null && sel(oi) && !q.correct.includes(oi) ? 'bg-red-500/20 border-red-500'
                : sel(oi) ? 'bg-blue-500/20 border-blue-500'
                : 'bg-slate-700/40 border-slate-600/40 hover:border-slate-500'}">
              {#if q.type === 'multi'}
                <span class="w-5 h-5 rounded border-2 flex items-center justify-center text-xs font-bold flex-shrink-0
                  {sel(oi) ? 'bg-blue-500 border-blue-500' : 'border-slate-500'}">
                  {sel(oi)?'✓':''}
                </span>
              {:else}
                <span class="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0
                  {sel(oi) ? 'bg-blue-500' : 'bg-slate-600'}">
                  {String.fromCharCode(65+oi)}
                </span>
              {/if}
              <span>{String.fromCharCode(65+oi)}) {opt}</span>
            </div>
          {/each}
        </div>

        <!-- Feedback -->
        {#if checked !== null}
          <div class="mt-4 rounded-xl p-4 border-l-4 {checked ? 'bg-emerald-500/10 border-emerald-500' : 'bg-red-500/10 border-red-500'}">
            <p class="font-bold {checked ? 'text-emerald-400' : 'text-red-400'}">{checked?'✓ Správne!':'✗ Nesprávne'}</p>
            <p class="text-sm text-slate-400 mt-1">Tvoja: {letter(answers[idx])}</p>
            {#if !checked}
              <p class="text-sm text-emerald-400 mt-0.5">
                Správna: {q.correct.map(c=>String.fromCharCode(65+c)).join(', ')}) {q.correct.map(c=>q.options[c]).join('; ')}
              </p>
            {/if}
          </div>
        {/if}
      </div>

      <div class="flex gap-2.5 flex-wrap">
        <button on:click={() => idx--} disabled={idx===0}
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

    <!-- Results -->
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
          <div class="rounded-xl p-3.5 bg-slate-800/60 border-l-4 {statuses[i]?'border-emerald-500':'border-red-500'}">
            <p class="font-semibold text-sm">{i+1}. {qr.question}</p>
            <p class="text-xs text-slate-400 mt-1">Tvoja: {letter(answers[i])}</p>
            <p class="text-xs text-emerald-400">Správna: {qr.correct.map(c=>String.fromCharCode(65+c)).join(', ')}</p>
          </div>
        {/each}
      </div>
    {/if}

  </main>
</div>
