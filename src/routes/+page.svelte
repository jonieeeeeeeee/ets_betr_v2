<script>
  import { goto } from '$app/navigation';
  import Nav from '$lib/Nav.svelte';
  import { META } from '$lib/questions.js';

  const tests = Object.entries(META);
  let showMix = false;
  let mixCount = 30, mixTime = 45;
  let sel = { A: true, B: true, C: true, D: false, LEG: false };

  function startMix() {
    const keys = Object.entries(sel).filter(([,v]) => v).map(([k]) => k);
    if (!keys.length) return alert('Vyber aspoň jeden test!');
    goto(`/test?t=MIX&keys=${keys.join(',')}&count=${mixCount}&time=${mixTime}`);
  }
</script>

<svelte:head><title>ELTEC Certifikačný systém</title></svelte:head>

<div class="min-h-screen">
  <Nav>
    <h1 class="text-4xl font-extrabold mb-1 animated-title">⚡ ELTEC</h1>
    <p class="text-slate-400 text-sm">Príprava na skúšky podľa Vyhlášky č. 508/2009 Z.z.</p>
  </Nav>

  <main class="max-w-6xl mx-auto px-5 py-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
    {#each tests as [key, m]}
      <div class="group relative bg-slate-800/60 border border-slate-700/50 rounded-3xl p-7 cursor-pointer
                  hover:border-blue-500/70 hover:-translate-y-1 hover:shadow-[0_20px_40px_-12px_rgba(59,130,246,.25)] transition-all overflow-hidden"
           on:click={() => goto(`/test?t=${key}`)}
           on:keydown={e => e.key==='Enter' && goto(`/test?t=${key}`)}
           role="button" tabindex="0">
        <span class="absolute -bottom-2 -right-2 text-[6rem] opacity-[0.07] select-none leading-none">{m.emoji}</span>
        <span class="absolute top-0 inset-x-0 h-1 bg-blue-500 rounded-t-3xl opacity-0 group-hover:opacity-100 transition-opacity"></span>
        <h3 class="text-xl font-bold mb-3">{m.name}</h3>
        <p class="text-slate-400 text-sm mb-5 leading-relaxed">{m.desc}</p>
        <button class="w-full py-2.5 rounded-full bg-blue-500 hover:bg-blue-600 text-white font-semibold text-sm transition-colors"
                on:click|stopPropagation={() => goto(`/test?t=${key}`)}>
          Spustiť test
        </button>
      </div>
    {/each}

    <!-- Mix card -->
    <div class="group relative bg-slate-800/60 border border-slate-700/50 rounded-3xl p-7 cursor-pointer
                hover:border-amber-500/70 hover:-translate-y-1 hover:shadow-[0_20px_40px_-12px_rgba(245,158,11,.25)] transition-all overflow-hidden"
         on:click={() => showMix = true}
         on:keydown={e => e.key==='Enter' && (showMix = true)}
         role="button" tabindex="0">
      <span class="absolute -bottom-2 -right-2 text-[6rem] opacity-[0.07] select-none leading-none">🎲</span>
      <span class="absolute top-0 inset-x-0 h-1 bg-amber-500 rounded-t-3xl opacity-0 group-hover:opacity-100 transition-opacity"></span>
      <h3 class="text-xl font-bold mb-3">Zmiešaný test</h3>
      <p class="text-slate-400 text-sm mb-5 leading-relaxed">Zmiešané otázky zo všetkých testov podľa vlastného výberu</p>
      <button class="w-full py-2.5 rounded-full bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm transition-colors"
              on:click|stopPropagation={() => showMix = true}>
        Spustiť mix
      </button>
    </div>
  </main>
</div>

<!-- Mix modal -->
{#if showMix}
  <div class="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-5"
       on:click|self={() => showMix = false} role="dialog" aria-modal="true">
    <div class="bg-slate-800 border border-slate-700/50 rounded-3xl w-full max-w-md shadow-2xl">
      <div class="flex justify-between items-center px-7 py-5 border-b border-slate-700/50">
        <h2 class="text-xl font-bold">🎲 Nastavenie mixu</h2>
        <button on:click={() => showMix = false} class="text-slate-400 hover:text-red-400 text-2xl leading-none">×</button>
      </div>
      <div class="p-7 space-y-5">
        <label class="block">
          <span class="text-sm font-semibold text-slate-300 block mb-1.5">📊 Počet otázok</span>
          <input type="number" bind:value={mixCount} min="5" max="200"
            class="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-500" />
        </label>
        <label class="block">
          <span class="text-sm font-semibold text-slate-300 block mb-1.5">⏱ Časový limit (min)</span>
          <input type="number" bind:value={mixTime} min="5" max="240"
            class="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-500" />
        </label>
        <div class="bg-slate-700/50 rounded-2xl p-4 space-y-2">
          <p class="text-amber-400 font-semibold text-sm mb-3">Vyber testy:</p>
          {#each Object.entries(META) as [k, m]}
            <label class="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" bind:checked={sel[k]} class="w-4 h-4 accent-amber-500" />
              <span class="text-slate-300 text-sm">{m.emoji} {m.name}</span>
            </label>
          {/each}
        </div>
        <button on:click={startMix}
          class="w-full py-3 rounded-full bg-amber-500 hover:bg-amber-600 text-white font-bold transition-colors">
          🎲 Spustiť
        </button>
      </div>
    </div>
  </div>
{/if}

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
</style>
