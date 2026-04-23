<script>
  import { onMount } from 'svelte';
  import Nav from '$lib/Nav.svelte';
  import { META, loadQuestions } from '$lib/questions.js';

  let tab = 'A';
  let data = {};
  let pdfFiles = [];
  let fileInput;
  let dragOver = false;

  const permanentPDFs = [
    { name: '📘 Zhrnutie A',   url: '/data/Zhrnutie-A.pdf' },
    { name: '📗 Zhrnutie B',   url: '/data/Zhrnutie-B.pdf' },
    { name: '📕 Zhrnutie C',   url: '/data/Zhrnutie-C.pdf' },
    { name: '📙 Zhrnutie D',   url: '/data/Zhrnutie-D.pdf' },
    { name: '📓 Legislatíva',  url: '/data/Zhrnutie-leg.pdf' },
  ];

  onMount(async () => {
    const saved = localStorage.getItem('pdfs');
    if (saved) pdfFiles = JSON.parse(saved);
    // Preload current tab
    if (!data[tab]) data[tab] = await loadQuestions(tab);
  });

  async function switchTab(t) {
    tab = t;
    if (!data[t]) data[t] = await loadQuestions(t);
  }

  function save() { localStorage.setItem('pdfs', JSON.stringify(pdfFiles)); }

  function handleFiles(files) {
    Array.from(files).forEach(file => {
      if (file.type !== 'application/pdf') return alert('Len PDF!');
      const r = new FileReader();
      r.onload = e => { pdfFiles = [...pdfFiles, { name: file.name, size: (file.size/1024).toFixed(0)+'KB', data: e.target.result.split(',')[1] }]; save(); };
      r.readAsDataURL(file);
    });
  }

  function openPDF(i) {
    const pdf = pdfFiles[i];
    const blob = new Blob([Uint8Array.from(atob(pdf.data), c => c.charCodeAt(0))], { type: 'application/pdf' });
    window.open(URL.createObjectURL(blob), '_blank');
  }

  function delPDF(i) {
    if (!confirm('Vymazať?')) return;
    pdfFiles = pdfFiles.filter((_, j) => j !== i);
    save();
  }
</script>

<svelte:head><title>📚 Správne odpovede | ELTEC</title></svelte:head>

<div class="min-h-screen bg-slate-950 text-slate-100">
  <Nav>
    <h1 class="text-3xl font-extrabold bg-gradient-to-r from-slate-100 to-blue-400 bg-clip-text text-transparent mb-1">📚 Správne odpovede</h1>
    <p class="text-slate-400 text-sm">Prehľad odpovedí a PDF materiály</p>
  </Nav>

  <main class="max-w-6xl mx-auto px-5 py-8 flex flex-col lg:flex-row gap-7">

    <!-- PDF sidebar -->
    <aside class="lg:w-72 flex-shrink-0 space-y-5 lg:sticky lg:top-6 lg:self-start">
      <!-- Upload -->
      <div on:click={() => fileInput.click()}
           on:dragover|preventDefault={() => dragOver=true}
           on:dragleave={() => dragOver=false}
           on:drop|preventDefault={e => { dragOver=false; handleFiles(e.dataTransfer.files); }}
           role="button" tabindex="0" on:keydown={e=>e.key==='Enter'&&fileInput.click()}
           class="border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-colors
             {dragOver ? 'border-blue-400 bg-blue-500/10' : 'border-slate-600/50 hover:border-blue-500/60'}">
        <input bind:this={fileInput} type="file" accept=".pdf" multiple class="hidden"
          on:change={e => { handleFiles(e.target.files); fileInput.value=''; }} />
        <p class="text-3xl mb-2">📤</p>
        <p class="text-slate-300 text-sm font-semibold">Nahrajte PDF</p>
        <p class="text-slate-500 text-xs mt-1">Kliknite alebo presuňte</p>
      </div>

      <!-- Permanent PDFs -->
      <div>
        <p class="text-sm font-bold text-slate-400 border-l-2 border-blue-500 pl-2 mb-2">📌 Trvalé materiály</p>
        {#each permanentPDFs as pdf}
          <div class="flex items-center gap-2.5 bg-slate-800/60 border border-slate-700/50 rounded-xl p-3 mb-2 hover:border-blue-500/40 transition-colors">
            <span>📄</span>
            <span class="flex-1 text-sm truncate">{pdf.name}</span>
            <button on:click={() => window.open(pdf.url,'_blank')}
              class="w-7 h-7 rounded-lg bg-slate-700 hover:bg-blue-500 transition-colors flex items-center justify-center text-xs">🔍</button>
          </div>
        {/each}
      </div>

      <!-- User PDFs -->
      {#if pdfFiles.length}
        <div>
          <p class="text-sm font-bold text-slate-400 border-l-2 border-blue-500 pl-2 mb-2">📁 Nahrané</p>
          {#each pdfFiles as pdf, i}
            <div class="flex items-center gap-2.5 bg-slate-800/60 border border-slate-700/50 rounded-xl p-3 mb-2">
              <span>📄</span>
              <div class="flex-1 min-w-0">
                <p class="text-sm truncate">{pdf.name}</p>
                <p class="text-xs text-slate-500">{pdf.size}</p>
              </div>
              <button on:click={() => openPDF(i)} class="w-7 h-7 rounded-lg bg-slate-700 hover:bg-blue-500 transition-colors flex items-center justify-center text-xs">🔍</button>
              <button on:click={() => delPDF(i)} class="w-7 h-7 rounded-lg bg-slate-700 hover:bg-red-500 transition-colors flex items-center justify-center text-xs">🗑️</button>
            </div>
          {/each}
        </div>
      {/if}
    </aside>

    <!-- Answers -->
    <div class="flex-1 min-w-0">
      <div class="flex flex-wrap gap-2 mb-5">
        {#each Object.entries(META) as [k, m]}
          <button on:click={() => switchTab(k)}
            class="px-4 py-1.5 rounded-full text-sm font-semibold border transition-all
              {tab===k ? 'bg-blue-500 border-blue-500 text-white' : 'bg-slate-800 border-slate-700/50 text-slate-400 hover:border-blue-500/50'}">
            {m.emoji} Test {k}
          </button>
        {/each}
      </div>

      {#if data[tab]}
        <div class="space-y-3">
          {#each data[tab] as q, i}
            <div class="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5">
              <p class="font-semibold text-sm mb-3">{i+1}. {q.question}</p>
              <div class="space-y-1.5">
                {#each q.options as opt, oi}
                  <div class="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm border
                    {q.correct.includes(oi) ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300' : 'bg-slate-700/40 border-slate-600/30 text-slate-400'}">
                    <span class="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0
                      {q.correct.includes(oi) ? 'bg-emerald-500 text-white' : 'bg-slate-600 text-slate-300'}">
                      {q.correct.includes(oi) ? '✓' : String.fromCharCode(65+oi)}
                    </span>
                    {String.fromCharCode(65+oi)}) {opt}
                  </div>
                {/each}
              </div>
            </div>
          {/each}
        </div>
      {:else}
        <div class="text-center py-20 text-slate-500">Načítavam...</div>
      {/if}
    </div>

  </main>
</div>
