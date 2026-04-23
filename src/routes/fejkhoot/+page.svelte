<script>
  import { onMount } from 'svelte';
  import Nav from '$lib/Nav.svelte';
  import { META, loadAll, shuffle } from '$lib/questions.js';

  // Firebase is loaded via CDN in onMount
  let db;

  // ── State ───────────────────────────────────────────────────
  let role = null; // 'host' | 'presenter' | 'player'

  // Host
  let gameId = '', players = {}, hostQuestions = [], hIdx = 0;
  let hQuestion = null, accepting = true, revealTimer;
  let sel = { A:true, B:true, C:true, D:false, LEG:false };
  let qCount = 10;
  let gameStarted = false;
  let roundResultsShown = false, roundResolveFn = null;

  // Presenter
  let presCode = '', presName = 'Prezentátor';
  let presConnected = false, presGameId = '';
  let presQuestion = null, presTimer, presTimerVal = 15;

  // Player
  let joinCode = '', joinName = '';
  let playerId = '', playerGameId = '';
  let playerPhase = 'join'; // join | waiting | question | waiting2 | end
  let playerQuestion = null, playerTimer, playerTimerVal = 15;
  let myAnswers = [], answerSent = false, playerScore = 0, playerRank = 0;

  onMount(async () => {
    // Load Firebase from CDN
    await Promise.all([
      loadScript('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js'),
      loadScript('https://www.gstatic.com/firebasejs/10.8.0/firebase-database-compat.js'),
    ]);
    firebase.initializeApp({ databaseURL: 'https://eltec-fejkhoot-default-rtdb.europe-west1.firebasedatabase.app/' });
    db = firebase.database();
  });

  function loadScript(src) {
    return new Promise(resolve => {
      const s = document.createElement('script'); s.src = src; s.onload = resolve;
      document.head.appendChild(s);
    });
  }

  function rnd() { return Math.random().toString(36).substring(2,8).toUpperCase(); }
  const letter = i => String.fromCharCode(65+i);
  const colors = ['#ef4444','#3b82f6','#f59e0b','#10b981'];

  // ════════════════════════════════════════════════════════════
  // HOST
  // ════════════════════════════════════════════════════════════
  async function hostStart() {
    gameId = rnd();
    await db.ref(`games/${gameId}`).set({ status:'lobby', players:{}, totalQuestions:0 });
    db.ref(`games/${gameId}/players`).on('value', s => { players = s.val() || {}; });
    role = 'host';
  }

  async function startGame() {
    const keys = Object.entries(sel).filter(([,v])=>v).map(([k])=>k);
    if (!keys.length) return alert('Vyber aspoň jednu kategóriu!');
    const db2 = await loadAll(keys);
    let all = keys.flatMap(k => db2[k]||[]);
    hostQuestions = shuffle(all).slice(0, Math.min(qCount, all.length));
    hIdx = 0; hQuestion = hostQuestions[0]; accepting = true; gameStarted = true;
    await db.ref(`games/${gameId}`).update({ status:'playing', totalQuestions: hostQuestions.length, currentQuestion:{ index:0, question:hQuestion } });
    db.ref(`games/${gameId}/questionDone`).on('value', s => {
      const done = s.val();
      if (done && done[hIdx] === true) showNextBtn = true;
    });
  }

  let showNextBtn = false;

  async function revealHost() {
    if (!accepting) return; accepting = false;
    clearTimeout(revealTimer);
    const snap = await db.ref(`games/${gameId}/answers/${hIdx}`).once('value');
    const ansMap = snap.val() || {};
    const sorted = Object.entries(ansMap).sort((a,b)=>(a[1].time||999)-(b[1].time||999));
    for (const [pid, ans] of sorted) {
      const p = players[pid]; if (!p) continue;
      const ok = hQuestion.type==='multi'
        ? ans.answers?.length===hQuestion.correct.length && ans.answers.every(a=>hQuestion.correct.includes(a))
        : ans.answer === hQuestion.correct[0];
      const pts = ok ? Math.floor(1000*Math.max(0,15000-(ans.time||15000))/15000) : 0;
      await db.ref(`games/${gameId}/players/${pid}/score`).set((p.score||0)+pts);
    }
    await db.ref(`games/${gameId}/questionDone/${hIdx}`).set(true);
    // show round results
    const snap2 = await db.ref(`games/${gameId}/players`).once('value');
    const arr = Object.values(snap2.val()||{}).sort((a,b)=>(b.score||0)-(a.score||0));
    roundPlayers = arr; roundResultsShown = true;
  }

  let roundPlayers = [];

  async function nextQuestion() {
    roundResultsShown = false; showNextBtn = false;
    if (hIdx+1 >= hostQuestions.length) return endGame();
    hIdx++; hQuestion = hostQuestions[hIdx]; accepting = true;
    await db.ref(`games/${gameId}/answers/${hIdx}`).remove();
    await db.ref(`games/${gameId}/currentQuestion`).set({ index:hIdx, question:hQuestion });
    revealTimer = setTimeout(revealHost, 15000);
  }

  async function endGame() {
    await db.ref(`games/${gameId}/status`).set('ended');
    const snap = await db.ref(`games/${gameId}/players`).once('value');
    const arr = Object.values(snap.val()||{}).sort((a,b)=>(b.score||0)-(a.score||0));
    alert('🏆 Hra skončila! Víťaz: '+(arr[0]?.name||'—'));
    await db.ref(`games/${gameId}`).remove();
    gameStarted = false; hIdx=0; hQuestion=null;
  }

  function displayHostQ() {
    clearTimeout(revealTimer);
    revealTimer = setTimeout(revealHost, 15000);
  }

  $: if (hQuestion) displayHostQ();

  // ════════════════════════════════════════════════════════════
  // PRESENTER
  // ════════════════════════════════════════════════════════════
  async function presConnect() {
    if (!presCode||!presName) return alert('Vyplň oba polia!');
    const snap = await db.ref(`games/${presCode}`).once('value');
    if (!snap.exists()) return alert('Hra neexistuje!');
    presGameId = presCode; presConnected = true;
    db.ref(`games/${presGameId}/currentQuestion`).on('value', s => {
      const d = s.val(); if (!d) return;
      presQuestion = d.question;
      startPresTimer(15);
    });
    db.ref(`games/${presGameId}/questionDone`).on('value', s => {
      const done = s.val();
      if (done && presQuestion) {
        clearInterval(presTimer); presTimerVal = '✓';
      }
    });
  }

  function startPresTimer(s) {
    clearInterval(presTimer); presTimerVal = s;
    presTimer = setInterval(() => { presTimerVal--; if (presTimerVal<=0) clearInterval(presTimer); }, 1000);
  }

  function presDisconnect() {
    presConnected = false; presQuestion = null;
    db.ref(`games/${presGameId}/currentQuestion`).off();
    db.ref(`games/${presGameId}/questionDone`).off();
  }

  // ════════════════════════════════════════════════════════════
  // PLAYER
  // ════════════════════════════════════════════════════════════
  async function joinGame() {
    if (!joinCode||!joinName) return alert('Vyplň oba polia!');
    const snap = await db.ref(`games/${joinCode}`).once('value');
    if (!snap.exists()||snap.val().status!=='lobby') return alert('Hra neexistuje alebo už začala!');
    playerId = 'p_'+Date.now()+'_'+rnd();
    playerGameId = joinCode;
    await db.ref(`games/${playerGameId}/players/${playerId}`).set({ name:joinName, score:0 });
    playerPhase = 'waiting';
    db.ref(`games/${playerGameId}/currentQuestion`).on('value', s => {
      const d = s.val(); if (!d) return;
      if (playerQuestion?.index !== d.index) {
        playerQuestion = d; myAnswers = []; answerSent = false;
        startPlayerTimer(15); playerPhase = 'question';
      }
    });
    db.ref(`games/${playerGameId}/questionDone`).on('value', s => {
      const done = s.val();
      if (done && playerQuestion && done[playerQuestion.index]===true) { clearInterval(playerTimer); playerPhase='waiting'; }
    });
    db.ref(`games/${playerGameId}/status`).on('value', async s => {
      if (s.val()==='ended') {
        clearInterval(playerTimer);
        const snap2 = await db.ref(`games/${playerGameId}/players`).once('value');
        const arr = Object.values(snap2.val()||{}).sort((a,b)=>(b.score||0)-(a.score||0));
        const me = arr.find(p=>p.name===joinName);
        playerScore = me?.score||0;
        playerRank = arr.findIndex(p=>p.name===joinName)+1;
        playerPhase = 'end';
      }
    });
  }

  function startPlayerTimer(s) {
    clearInterval(playerTimer); playerTimerVal = s;
    playerTimer = setInterval(() => { playerTimerVal--; if (playerTimerVal<=0) clearInterval(playerTimer); }, 1000);
  }

  function pickAnswer(oi) {
    if (answerSent || !playerQuestion) return;
    const q = playerQuestion.question;
    if (q.type==='multi') {
      const i = myAnswers.indexOf(oi); i===-1 ? myAnswers.push(oi) : myAnswers.splice(i,1);
      myAnswers = [...myAnswers];
    } else {
      myAnswers = [oi];
      sendAnswer();
    }
  }

  async function sendAnswer() {
    if (answerSent) return; answerSent = true;
    const q = playerQuestion.question;
    const timeTaken = (15-playerTimerVal)*1000;
    const payload = q.type==='multi' ? { answers:myAnswers, time:timeTaken } : { answer:myAnswers[0], time:timeTaken };
    await db.ref(`games/${playerGameId}/answers/${playerQuestion.index}/${playerId}`).set(payload);
  }
</script>

<svelte:head><title>🎮 Fejkhoot | ELTEC</title></svelte:head>

<div class="min-h-screen ">
  <Nav>
    <h1 class="text-3xl font-extrabold bg-gradient-to-r from-slate-100 to-blue-400 bg-clip-text text-transparent mb-1">🎮 Fejkhoot</h1>
    <p class="text-slate-400 text-sm">Multiplayer kvíz — hosť, prezentujúci, hráč</p>
  </Nav>

  <main class="max-w-5xl mx-auto px-5 py-8">

    <!-- Role select -->
    {#if !role}
      <div class="flex flex-wrap justify-center gap-5 mt-10">
        {#each [['host','🖥️','Hostiteľ','Vytvor hru'],['presenter','📽️','Prezentujúci','Zobrazuj otázky'],['player','📱','Hráč','Odpovedaj']] as [r, icon, title, desc]}
          <button on:click={() => r==='host' ? hostStart() : (role=r)}
            class="bg-slate-800 border border-slate-700/50 rounded-3xl p-8 w-52 text-center hover:border-blue-500 hover:-translate-y-1 transition-all">
            <p class="text-5xl mb-3">{icon}</p>
            <h2 class="text-lg font-bold">{title}</h2>
            <p class="text-slate-400 text-sm mt-1">{desc}</p>
          </button>
        {/each}
      </div>

    <!-- HOST -->
    {:else if role === 'host'}
      <div class="flex flex-col lg:flex-row gap-5">
        <!-- Left: question area -->
        <div class="flex-[2] bg-slate-800 border border-slate-700/50 rounded-2xl p-6">
          <div class="flex justify-between items-center mb-4 flex-wrap gap-2">
            <h2 class="text-xl font-bold">🖥️ Hostiteľ</h2>
            <span class="font-mono text-2xl font-extrabold text-blue-400 tracking-widest bg-slate-900 px-4 py-1 rounded-xl border border-blue-500/30">
              {gameId}
            </span>
          </div>

          {#if !gameStarted}
            <div class="space-y-4">
              <div class="flex flex-wrap gap-2">
                {#each Object.entries(META) as [k, m]}
                  <label class="flex items-center gap-2 bg-slate-700 px-3 py-1.5 rounded-full text-sm cursor-pointer">
                    <input type="checkbox" bind:checked={sel[k]} class="accent-blue-500" />
                    {m.emoji} {k}
                  </label>
                {/each}
              </div>
              <label class="flex items-center gap-3 text-sm">
                <span class="text-slate-300">Otázok:</span>
                <select bind:value={qCount} class="bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5">
                  {#each [5,10,15,20,30] as n}<option value={n}>{n}</option>{/each}
                </select>
              </label>
              <button on:click={startGame} disabled={!Object.values(players).length}
                class="px-6 py-2.5 rounded-full bg-blue-500 hover:bg-blue-600 text-white font-bold disabled:opacity-40 transition-colors">
                🚀 Spustiť hru ({Object.values(players).length} hráčov)
              </button>
            </div>
          {:else if hQuestion}
            <p class="text-lg font-bold mb-4">{hIdx+1}. {hQuestion.question}</p>
            <div class="grid grid-cols-2 gap-3 mb-4">
              {#each hQuestion.options as opt, oi}
                <div class="rounded-xl px-4 py-3 text-sm font-semibold border-l-4 bg-slate-700/60"
                  style="border-left-color:{colors[oi]}">
                  {letter(oi)}) {opt}
                </div>
              {/each}
            </div>
            <div class="flex gap-3 flex-wrap">
              <button on:click={revealHost} class="px-5 py-2 rounded-full bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm">⏩ Odhaliť</button>
              {#if showNextBtn}
                <button on:click={nextQuestion} class="px-5 py-2 rounded-full bg-blue-500 hover:bg-blue-600 text-white font-semibold text-sm">Ďalšia →</button>
              {/if}
              <button on:click={endGame} class="px-5 py-2 rounded-full bg-red-500 hover:bg-red-600 text-white font-semibold text-sm">🏁 Koniec</button>
            </div>
          {/if}
        </div>

        <!-- Right: players -->
        <div class="lg:w-64 space-y-4">
          <div class="bg-slate-800 border border-slate-700/50 rounded-2xl p-4">
            <h3 class="font-bold mb-3">👥 Hráči ({Object.values(players).length})</h3>
            <div class="space-y-1.5 max-h-48 overflow-y-auto">
              {#each Object.values(players).sort((a,b)=>(b.score||0)-(a.score||0)) as p}
                <div class="flex justify-between text-sm py-1 border-b border-slate-700/30">
                  <span>{p.name}</span><span class="text-blue-400">{p.score||0}</span>
                </div>
              {/each}
            </div>
          </div>
        </div>
      </div>

      <!-- Round results overlay -->
      {#if roundResultsShown}
        <div class="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-5">
          <div class="bg-slate-800 border border-blue-500/40 rounded-3xl p-8 w-full max-w-md text-center">
            <h3 class="text-xl font-bold text-blue-400 mb-5">📊 Výsledky kola</h3>
            <div class="space-y-2 mb-6">
              {#each roundPlayers.slice(0,5) as p, i}
                <div class="flex justify-between px-4 py-2 rounded-xl {i===0?'bg-amber-500/20 font-bold':'bg-slate-700/40'}">
                  <span>{i+1}. {p.name}</span><span>{p.score||0} b</span>
                </div>
              {/each}
            </div>
            <button on:click={nextQuestion} class="px-8 py-2.5 rounded-full bg-blue-500 hover:bg-blue-600 text-white font-semibold">Pokračovať</button>
          </div>
        </div>
      {/if}

    <!-- PRESENTER -->
    {:else if role === 'presenter'}
      {#if !presConnected}
        <div class="max-w-md mx-auto bg-slate-800 border border-slate-700/50 rounded-3xl p-8 mt-8 space-y-4">
          <h2 class="text-xl font-bold">📽️ Prezentujúci</h2>
          <input bind:value={presCode} placeholder="Kód miestnosti"
            class="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-500 uppercase" />
          <input bind:value={presName} placeholder="Tvoje meno"
            class="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-500" />
          <button on:click={presConnect} class="w-full py-3 rounded-full bg-blue-500 hover:bg-blue-600 text-white font-bold">🔗 Pripojiť</button>
        </div>
      {:else}
        <div class="bg-slate-800 border border-slate-700/50 rounded-2xl p-6">
          <div class="flex justify-between items-center mb-4 flex-wrap gap-3">
            <h2 class="text-xl font-bold">📽️ Prezentujúci — {presGameId}</h2>
            <div class="flex items-center gap-3">
              <span class="text-3xl font-extrabold font-mono w-14 h-14 rounded-full border-2 border-blue-500 flex items-center justify-center text-blue-400">
                {presTimerVal}
              </span>
              <button on:click={presDisconnect} class="px-4 py-2 rounded-full bg-red-500 hover:bg-red-600 text-white text-sm font-semibold">Odpojiť</button>
            </div>
          </div>
          {#if presQuestion}
            <p class="text-lg font-bold mb-4">{presQuestion.question}</p>
            <div class="grid grid-cols-2 gap-3">
              {#each presQuestion.options as opt, oi}
                <div class="rounded-xl px-4 py-3 text-sm font-semibold border-l-4 bg-slate-700/60"
                  style="border-left-color:{colors[oi]}">
                  {letter(oi)}) {opt}
                </div>
              {/each}
            </div>
          {:else}
            <p class="text-slate-400 text-center py-10">Čakám na otázku...</p>
          {/if}
        </div>
      {/if}

    <!-- PLAYER -->
    {:else if role === 'player'}
      {#if playerPhase === 'join'}
        <div class="max-w-sm mx-auto bg-slate-800 border border-slate-700/50 rounded-3xl p-8 mt-8 space-y-4 text-center">
          <h2 class="text-xl font-bold">📱 Pripojiť sa</h2>
          <input bind:value={joinCode} placeholder="Kód miestnosti" maxlength="6"
            class="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-2.5 text-center uppercase tracking-widest text-lg focus:outline-none focus:border-blue-500" />
          <input bind:value={joinName} placeholder="Tvoje meno"
            class="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-2.5 text-center focus:outline-none focus:border-blue-500" />
          <button on:click={joinGame} class="w-full py-3 rounded-full bg-blue-500 hover:bg-blue-600 text-white font-bold">🔗 Pripojiť</button>
        </div>

      {:else if playerPhase === 'waiting'}
        <div class="flex flex-col items-center justify-center min-h-[50vh] text-center">
          <p class="text-6xl mb-4">⏳</p>
          <h2 class="text-2xl font-bold">Čakám na otázku...</h2>
          <p class="text-slate-400 mt-2">Hostiteľ čoskoro spustí ďalšiu otázku</p>
        </div>

      {:else if playerPhase === 'question' && playerQuestion}
        {@const pq = playerQuestion.question}
        <div class="fixed inset-0 bg-slate-950 flex flex-col">
          <!-- Timer & progress -->
          <div class="flex justify-between items-center px-5 py-3 bg-slate-800 border-b border-slate-700/30">
            <span class="text-sm bg-slate-700 px-3 py-1 rounded-full">Otázka {playerQuestion.index+1}</span>
            <span class="text-2xl font-bold font-mono w-12 h-12 rounded-full border-2 border-blue-500 flex items-center justify-center
              {playerTimerVal<=5?'text-red-400 border-red-500 animate-pulse':'text-blue-400'}">
              {playerTimerVal}
            </span>
          </div>
          <div class="flex-1 flex items-center justify-center px-5 py-4 text-center">
            <h2 class="text-xl font-bold leading-snug max-w-lg">{pq.question}</h2>
          </div>
          <div class="grid grid-cols-2 gap-3 p-4 bg-slate-900 border-t border-slate-700/30">
            {#each pq.options as opt, oi}
              <button on:click={() => pickAnswer(oi)} disabled={answerSent}
                class="py-5 rounded-2xl font-bold text-white transition-all active:scale-95 disabled:opacity-60
                  {myAnswers.includes(oi) ? 'ring-4 ring-white/50 scale-105' : ''}"
                style="background:{colors[oi]}">
                <span class="text-2xl block">{letter(oi)}</span>
                <span class="text-xs mt-1 block opacity-90 px-2 leading-tight">{opt.length>25?opt.slice(0,25)+'…':opt}</span>
              </button>
            {/each}
          </div>
          {#if pq.type==='multi' && myAnswers.length > 0 && !answerSent}
            <div class="px-4 pb-4 bg-slate-900">
              <button on:click={sendAnswer} class="w-full py-3 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold">
                ✅ Odoslať odpoveď
              </button>
            </div>
          {/if}
          {#if answerSent}
            <div class="px-4 pb-4 bg-slate-900 text-center text-emerald-400 font-semibold py-3">✅ Odpoveď zaznamenaná!</div>
          {/if}
        </div>

      {:else if playerPhase === 'end'}
        <div class="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <p class="text-6xl mb-4">🏆</p>
          <h2 class="text-3xl font-extrabold mb-2">Hra skončila!</h2>
          <p class="text-5xl font-extrabold text-blue-400 my-4">{playerScore} bodov</p>
          <p class="text-slate-400 text-xl">Umiestnenie: <strong class="text-white">#{playerRank}</strong></p>
          <button on:click={() => location.reload()} class="mt-8 px-8 py-3 rounded-full bg-blue-500 hover:bg-blue-600 text-white font-bold">
            🔙 Späť
          </button>
        </div>
      {/if}
    {/if}

  </main>
</div>
