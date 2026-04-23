<script>
  import { onMount, onDestroy } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { META, loadQuestions, loadAll, shuffle, checkAnswer, scoreColor, scoreMsg } from '$lib/questions.js';

  let questions = [], idx = 0, answers = [], timeLeft = 0, timer;
  let done = false, results = null;
  let cfg = { name: '', desc: '', time: 40 };

  onMount(async () => {
    const p = $page.url.searchParams;
    const t = p.get('t') ?? 'A';

    if (t === 'MIX') {
      const keys = (p.get('keys') ?? 'A,B,C').split(',');
      const time = +p.get('time') || 45;
      const count = +p.get('count') || 30;
      const db = await loadAll(keys);
      const all = keys.flatMap(k => db[k] ?? []);
      questions = shuffle(all).slice(0, Math.min(count, all.length));
      cfg = { name: 'Zmiešaný test', desc: `${questions.length} otázok — ${keys.join(', ')}`, time };
    } else {
      questions = shuffle(await loadQuestions(t));
      cfg = META[t] ?? META.A;
    }

    answers = Array(questions.length).fill(null);
    timeLeft = cfg.time * 60;
    timer = setInterval(() => { if (--timeLeft <= 0) submit(); }, 1000);
  });

  onDestroy(() => clearInterval(timer));

  $: mins = String(Math.floor(timeLeft / 60)).padStart(2, '0');
  $: secs = String(timeLeft % 60).padStart(2, '0');
  $: progress = answers.filter(a => a !== null).length / (questions.length || 1) * 100;
  $: q = questions[idx];

  function pick(oi) {
    if (q.type === 'single') {
      answers[idx] = [oi];
    } else {
      const cur = answers[idx] ? [...answers[idx]] : [];
      const i = cur.indexOf(oi);
      i === -1 ? cur.push(oi) : cur.splice(i, 1);
      answers[idx] = cur.length ? cur : null;
    }
    answers = answers;
  }

  function submit() {
    clearInterval(timer);
    let score = 0;
    const details = questions.map((q, i) => {
      const ans = answers[i] ?? [];
      const ok = checkAnswer(q, ans);
      if (ok) score++;
      return {
        question: q.question, ok,
        user: ans.length ? ans.map(a => String.fromCharCode(65+a)).join(', ') : '—',
        correct: q.correct.map(c => String.fromCharCode(65+c)).join(', '),
        correctText: q.correct.map(c => q.options[c]).join('; ')
      };
    });
    results = { score, total: questions.length, pct: Math.round(score/questions.length*100), details };
    done = true;
  }
</script>

<svelte:head><title>{cfg.name} | ELTEC</title></svelte:head>

<div class="min-h-screen flex flex-col">
  <!-- Header -->
  <div class="bg-slate-800 border-b border-slate-700/50 px-5 py-3 flex justify-between items-center gap-4 flex-wrap">
    <div>
      <h2 class="font-bold text-lg">{cfg.name}</h2>
      <p class="text-slate-400 text-xs">{cfg.desc}</p>
    </div>
    <span class="font-mono text-xl font-bold px-5 py-1.5 rounded-full border"
      class:timer-urgent={timeLeft <= 60}
      class:timer-normal={timeLeft > 60}>
      {mins}:{secs}
    </span>
  </div>

  <!-- Progress -->
  <div class="h-1 bg-slate-800">
    <div class="h-full bg-emerald-500 transition-all" style="width:{progress}%"></div>
  </div>

  <!-- Nav dots -->
  <div class="flex flex-wrap gap-1.5 px-5 py-3 bg-slate-800/40 border-b border-slate-700/30">
    {#each questions as _, i}
      <button on:click={() => idx=i}
        class="dot-btn"
        class:dot-active={i===idx}
        class:dot-answered={answers[i] && i!==idx}>
        {i+1}
      </button>
    {/each}
  </div>

  <!-- Question -->
  {#if q && !done}
    <div class="flex-1 max-w-2xl mx-auto w-full px-5 py-8">
      <div class="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6 mb-5">
        <p class="text-blue-400 text-xs font-bold uppercase tracking-widest mb-2">
          Otázka {idx+1} / {questions.length}
          {#if q.type === 'multi'}<span class="ml-2 text-amber-400">✦ viac správnych</span>{/if}
        </p>
        <h2 class="text-lg font-bold leading-snug">{q.question}</h2>
      </div>

      <div class="space-y-2.5 mb-8">
        {#each q.options as opt, oi}
          <button on:click={() => pick(oi)}
            class="opt-row w-full text-left"
            class:opt-selected={Array.isArray(answers[idx]) && answers[idx].includes(oi)}>
            <input type={q.type==='single'?'radio':'checkbox'}
              checked={Array.isArray(answers[idx]) && answers[idx].includes(oi)}
              on:click|stopPropagation={() => pick(oi)}
              class="w-4 h-4 accent-blue-500 flex-shrink-0" />
            <span class="font-medium text-sm">{String.fromCharCode(65+oi)}) {opt}</span>
          </button>
        {/each}
      </div>

      <div class="flex justify-between gap-3">
        <button on:click={() => idx--} disabled={idx===0}
          class="px-6 py-2.5 rounded-full font-semibold bg-slate-700 hover:bg-slate-600 disabled:opacity-40 transition-colors min-w-[130px]">
          ← Späť
        </button>
        {#if idx === questions.length-1}
          <button on:click={submit}
            class="px-6 py-2.5 rounded-full font-semibold bg-emerald-500 hover:bg-emerald-600 text-white transition-colors min-w-[130px]">
            ✅ Odovzdať
          </button>
        {:else}
          <button on:click={() => idx++}
            class="px-6 py-2.5 rounded-full font-semibold bg-blue-500 hover:bg-blue-600 text-white transition-colors min-w-[130px]">
            Ďalšia →
          </button>
        {/if}
      </div>
    </div>
  {/if}
</div>

<!-- Results -->
{#if done && results}
  <div class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-5">
    <div class="bg-slate-800 border border-slate-700/50 rounded-3xl w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col">
      <div class="flex justify-between items-center px-7 py-5 border-b border-slate-700/50 flex-shrink-0">
        <h2 class="text-xl font-bold">📊 Výsledky</h2>
        <button on:click={() => goto('/')} class="text-slate-400 hover:text-red-400 text-2xl leading-none">×</button>
      </div>
      <div class="overflow-y-auto p-7">
        <div class="flex flex-col items-center mb-7">
          <div class="relative w-32 h-32 mb-3">
            <svg class="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" fill="none" stroke="#334155" stroke-width="10"/>
              <circle cx="50" cy="50" r="40" fill="none"
                stroke={scoreColor(results.pct)} stroke-width="10" stroke-linecap="round"
                stroke-dasharray="{2*Math.PI*40}"
                stroke-dashoffset="{2*Math.PI*40*(1-results.pct/100)}"/>
            </svg>
            <div class="absolute inset-0 flex flex-col items-center justify-center">
              <span class="text-3xl font-extrabold" style="color:{scoreColor(results.pct)}">{results.score}</span>
              <span class="text-slate-400 text-sm">/ {results.total}</span>
            </div>
          </div>
          <p class="text-xl font-bold" style="color:{scoreColor(results.pct)}">{scoreMsg(results.pct)}</p>
          <p class="text-slate-400 text-sm mt-1">Úspešnosť: <strong class="text-slate-200">{results.pct}%</strong></p>
        </div>

        <div class="space-y-2.5 mb-6">
          {#each results.details as d, i}
            <div class="rounded-xl p-3.5 bg-slate-700/40 border-l-4"
              class:border-emerald-500={d.ok} class:border-red-500={!d.ok}>
              <p class="font-semibold text-sm">{i+1}. {d.question}</p>
              <p class="text-xs mt-1" class:text-emerald-400={d.ok} class:text-red-400={!d.ok}>
                {d.ok?'✓':'✗'} Vaša: {d.user}
              </p>
              {#if !d.ok}<p class="text-xs text-slate-400">Správna: {d.correct}) {d.correctText}</p>{/if}
            </div>
          {/each}
        </div>

        <div class="flex gap-3">
          <button on:click={() => location.reload()}
            class="flex-1 py-2.5 rounded-full bg-blue-500 hover:bg-blue-600 text-white font-semibold transition-colors">
            🔄 Znova
          </button>
          <button on:click={() => goto('/')}
            class="flex-1 py-2.5 rounded-full bg-slate-700 hover:bg-slate-600 font-semibold transition-colors">
            🏠 Domov
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .opt-row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px 20px;
    border-radius: 16px;
    border: 2px solid rgba(51, 65, 85, 0.5);
    background: rgba(30, 41, 59, 0.6);
    cursor: pointer;
    transition: border-color 0.15s, background 0.15s, transform 0.1s;
  }
  .opt-row:hover { border-color: #64748b; transform: translateX(4px); }
  .opt-selected {
    background: rgba(59, 130, 246, 0.25) !important;
    border-color: #3b82f6 !important;
    transform: translateX(4px);
  }

  .dot-btn {
    width: 36px; height: 36px;
    border-radius: 10px;
    font-size: 12px; font-weight: bold;
    background: #334155; color: #cbd5e1;
    border: none; cursor: pointer;
    transition: all 0.15s;
  }
  .dot-btn:hover { background: #475569; }
  .dot-active   { background: #3b82f6 !important; color: white !important; transform: scale(1.1); }
  .dot-answered { background: #10b981 !important; color: white !important; }

  .timer-normal { color: #fbbf24; border-color: rgba(245,158,11,0.3); }
  .timer-urgent { color: #f87171; border-color: rgba(239,68,68,0.4); animation: pulse 1s infinite; }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
</style>
