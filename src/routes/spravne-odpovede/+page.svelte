<script>
  import { onMount } from 'svelte';
  import Nav from '$lib/Nav.svelte';
  import { META, loadQuestions } from '$lib/questions.js';

  let tab = 'A';
  let data = {};
  let fileInput;
  let dragOver = false;
  let pdfFiles = [];

  // PDF viewer modal
  let viewerOpen = false;
  let viewerUrl = '';
  let viewerName = '';

  const permanentPDFs = [
    { name: 'Zhrnutie A',  emoji: '📘', url: '/data/Zhrnutie-A.pdf'   },
    { name: 'Zhrnutie B',  emoji: '📗', url: '/data/Zhrnutie-B.pdf'   },
    { name: 'Zhrnutie C',  emoji: '📕', url: '/data/Zhrnutie-C.pdf'   },
    { name: 'Zhrnutie D',  emoji: '📙', url: '/data/Zhrnutie-D.pdf'   },
    { name: 'Legislatíva', emoji: '📓', url: '/data/Zhrnutie-leg.pdf' },
  ];

  onMount(async () => {
    try { pdfFiles = JSON.parse(localStorage.getItem('pdfs') ?? '[]'); } catch {}
    if (!data[tab]) data[tab] = await loadQuestions(tab);
  });

  async function switchTab(t) {
    tab = t;
    if (!data[t]) data[t] = await loadQuestions(t);
  }

  function openViewer(url, name) {
    viewerUrl = url;
    viewerName = name;
    viewerOpen = true;
  }

  function closeViewer() {
    viewerOpen = false;
    viewerUrl = '';
  }

  function handleFiles(files) {
    Array.from(files).forEach(file => {
      if (file.type !== 'application/pdf') return alert('Len PDF!');
      const r = new FileReader();
      r.onload = e => {
        pdfFiles = [...pdfFiles, { name: file.name, size: (file.size/1024).toFixed(0)+'KB', data: e.target.result }];
        localStorage.setItem('pdfs', JSON.stringify(pdfFiles));
      };
      r.readAsDataURL(file);
    });
  }

  function openUserPDF(i) {
    openViewer(pdfFiles[i].data, pdfFiles[i].name);
  }

  function delPDF(i) {
    if (!confirm('Vymazať?')) return;
    pdfFiles = pdfFiles.filter((_, j) => j !== i);
    localStorage.setItem('pdfs', JSON.stringify(pdfFiles));
  }
</script>

<svelte:head><title>📚 Správne odpovede | ELTEC</title></svelte:head>

<div class="min-h-screen">
  <Nav>
    <h1 class="text-3xl font-extrabold bg-gradient-to-r from-slate-100 to-blue-400 bg-clip-text text-transparent mb-1">📚 Správne odpovede</h1>
    <p class="text-slate-400 text-sm">Prehľad odpovedí a PDF materiály</p>
  </Nav>

  <main class="max-w-6xl mx-auto px-5 py-8 flex flex-col lg:flex-row gap-7">

    <!-- PDF sidebar -->
    <aside class="lg:w-72 flex-shrink-0 space-y-5 lg:sticky lg:top-6 lg:self-start">

      <!-- Upload zone -->
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
          <button on:click={() => openViewer(pdf.url, pdf.name)}
            class="w-full flex items-center gap-2.5 bg-slate-800/60 border border-slate-700/50 rounded-xl p-3 mb-2
                   hover:border-blue-500/60 hover:bg-blue-500/10 transition-all text-left">
            <span class="text-xl">{pdf.emoji}</span>
            <span class="flex-1 text-sm font-medium">{pdf.name}</span>
            <span class="text-xs text-slate-400 bg-slate-700 px-2 py-0.5 rounded-full">otvoriť</span>
          </button>
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
              <button on:click={() => openUserPDF(i)}
                class="w-7 h-7 rounded-lg bg-slate-700 hover:bg-blue-500 transition-colors flex items-center justify-center text-xs">🔍</button>
              <button on:click={() => delPDF(i)}
                class="w-7 h-7 rounded-lg bg-slate-700 hover:bg-red-500 transition-colors flex items-center justify-center text-xs">🗑️</button>
            </div>
          {/each}
        </div>
      {/if}
    </aside>

    <!-- Answers panel -->
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

<!-- PDF Viewer Modal -->
{#if viewerOpen}
  <div class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex flex-col" role="dialog" aria-modal="true">
    <!-- Modal header -->
    <div class="flex items-center justify-between px-5 py-3 bg-slate-800 border-b border-slate-700/50 flex-shrink-0">
      <h2 class="font-bold text-lg">{viewerName}</h2>
      <div class="flex gap-2">
        <a href={viewerUrl} download
          class="px-4 py-1.5 rounded-full bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold transition-colors">
          ⬇ Stiahnuť
        </a>
        <button on:click={closeViewer}
          class="px-4 py-1.5 rounded-full bg-slate-700 hover:bg-red-500 text-sm font-semibold transition-colors">
          ✕ Zavrieť
        </button>
      </div>
    </div>
    <!-- iframe viewer -->
    <iframe
      src={viewerUrl}
      title={viewerName}
      class="flex-1 w-full border-0"
      type="application/pdf">
      <p class="text-center py-10 text-slate-400">
        Váš prehliadač nepodporuje zobrazenie PDF.
        <a href={viewerUrl} class="text-blue-400 underline">Stiahnuť PDF</a>
      </p>
    </iframe>
  </div>
{/if}
