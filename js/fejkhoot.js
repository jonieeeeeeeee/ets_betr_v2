// =====================================================================
// fejkhoot.js — Logika multiplayer hry FEJKHOOT
// Závisí od: questions.js (questionsDatabase), Firebase (globálna premenná `database`)
// =====================================================================

// ===== Globálny stav =====
let gameId = null, role = null, currentQuestions = [], currentIndex = 0, gameActive = false;
let currentQuestion = null, acceptingAnswers = false, players = {}, playerId = null;
let myAnswers = [], isMultiChoice = false, answerSubmitted = false, revealTimer = null;
let playerTimerInterval = null, playerCurrentIndex = -1, totalQuestionsCount = 0, questionStartTime = 0;
let roundResultsCallback = null, presenterActive = false, presenterGameId = null, presenterTimerInterval = null;

// ===== Pomocné funkcie =====
function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function prepareQuestions(categoryCheckboxesId, countSelectId) {
    const categories = Array.from(document.querySelectorAll(`#${categoryCheckboxesId} input:checked`))
        .map(cb => cb.value);
    if (categories.length === 0) { alert('Vyber aspoň jednu kategóriu!'); return null; }

    let all = [];
    categories.forEach(c => { if (questionsDatabase[c]) all.push(...questionsDatabase[c]); });
    if (all.length === 0) { alert('Žiadne otázky!'); return null; }

    const count = parseInt(document.getElementById(countSelectId).value);
    return shuffleArray([...all]).slice(0, Math.min(count, all.length));
}

function displayHostOptions(containerId, options, correctIndices = null) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const letters = ['A', 'B', 'C', 'D'];
    container.innerHTML = options.map((opt, i) => {
        const correct = correctIndices && correctIndices.includes(i);
        return `<div class="opt-host-btn ${letters[i]} ${correct ? 'correct-answer' : ''}">${letters[i]}) ${opt}</div>`;
    }).join('');
}

// ===== Výber roly =====
function selectRole(r) {
    role = r;
    document.getElementById('roleScreen').style.display = 'none';

    if (r === 'host') {
        gameId = Math.random().toString(36).substring(2, 8).toUpperCase();
        document.getElementById('roomCode').textContent = gameId;
        document.getElementById('hostView').style.display = 'flex';
        database.ref(`games/${gameId}`).set({ players: {}, status: 'lobby', totalQuestions: 0 });
        listenForLobby();
    } else if (r === 'presenter') {
        document.getElementById('presenterView').style.display = 'flex';
    } else {
        document.getElementById('playerView').classList.add('active');
    }
}

// ===== Hostiteľ =====
function listenForLobby() {
    database.ref(`games/${gameId}/players`).on('value', (snap) => {
        players = snap.val() || {};
        updatePlayersList();
        document.getElementById('startGameBtn').disabled = Object.keys(players).length === 0;
    });
}

function updatePlayersList() {
    const arr = Object.values(players).sort((a, b) => (b.score || 0) - (a.score || 0));
    document.getElementById('playerCount').textContent = arr.length;

    const listHtml = arr.length
        ? arr.map(p => `<div class="player-item"><span>${p.name}</span><span>${p.score || 0}</span></div>`).join('')
        : '<div style="text-align:center">Zatiaľ žiadni hráči</div>';

    document.getElementById('playersList').innerHTML = listHtml;
    document.getElementById('leaderboard').innerHTML = arr.length
        ? arr.slice(0, 5).map((p, i) => `<div class="player-item"><span>${i + 1}. ${p.name}</span><span>${p.score || 0}</span></div>`).join('')
        : '<div style="text-align:center">-</div>';
}

async function startGame() {
    const qs = prepareQuestions('categoryCheckboxes', 'questionCountSelect');
    if (!qs) return;

    currentQuestions = qs;
    currentIndex = 0;
    gameActive = true;
    totalQuestionsCount = currentQuestions.length;
    currentQuestion = currentQuestions[0];
    acceptingAnswers = true;

    await database.ref(`games/${gameId}`).update({
        questions: currentQuestions,
        totalQuestions: totalQuestionsCount,
        status: 'playing',
        currentQuestion: { index: 0, question: currentQuestions[0] }
    });

    document.getElementById('startGameBtn').style.display = 'none';
    document.getElementById('endGameBtn').style.display = 'inline-block';
    displayHostQuestion();
    listenForGameHost();
}

function listenForGameHost() {
    database.ref(`games/${gameId}/questionDone`).on('value', (snap) => {
        const done = snap.val();
        if (done && done[currentIndex] === true && gameActive) {
            document.getElementById('nextQuestionBtn').style.display = 'inline-block';
        }
    });
}

function displayHostQuestion() {
    if (!currentQuestion) return;
    displayHostOptions('hostOptions', currentQuestion.options);
    displayHostOptions('fsHostOptions', currentQuestion.options);
    document.getElementById('questionText').innerHTML = `${currentIndex + 1}. ${currentQuestion.question}`;
    document.getElementById('fsQuestionText').innerHTML = `${currentIndex + 1}. ${currentQuestion.question}`;
    document.querySelectorAll('.opt-host-btn').forEach(btn => btn.classList.remove('correct-answer'));

    if (revealTimer) clearTimeout(revealTimer);
    questionStartTime = Date.now();
    revealTimer = setTimeout(() => { if (acceptingAnswers) revealAnswers(); }, 15000);
}

async function revealAnswers() {
    if (!acceptingAnswers) return;
    acceptingAnswers = false;

    const q = currentQuestion;
    const isMulti = q.type === 'multi';
    const answersSnap = await database.ref(`games/${gameId}/answers/${currentIndex}`).once('value');
    const answers = answersSnap.val() || {};
    const sortedAnswers = Object.entries(answers).sort((a, b) => (a[1].time || 999) - (b[1].time || 999));
    const totalTime = 15000;

    for (const [pid, ansData] of sortedAnswers) {
        const player = players[pid];
        if (!player) continue;
        let points = 0;
        const isCorrect = isMulti
            ? ansData.answers?.length === q.correct.length && ansData.answers.every(a => q.correct.includes(a))
            : ansData.answer === q.correct[0];

        if (isCorrect) {
            const remaining = Math.max(0, totalTime - (ansData.time || totalTime));
            points = Math.floor(1000 * (remaining / totalTime));
        }
        await database.ref(`games/${gameId}/players/${pid}/score`).set((player.score || 0) + points);
        await database.ref(`games/${gameId}/players/${pid}/lastPoints`).set(points);
    }

    const btns = document.querySelectorAll('.opt-host-btn');
    q.correct.forEach(c => { if (btns[c]) btns[c].classList.add('correct-answer'); });
    await database.ref(`games/${gameId}/questionDone/${currentIndex}`).set(true);
    await showRoundResults();
}

async function showRoundResults() {
    const snap = await database.ref(`games/${gameId}/players`).once('value');
    const allPlayers = Object.values(snap.val() || {}).sort((a, b) => (b.score || 0) - (a.score || 0));
    const topHtml = allPlayers.slice(0, 5)
        .map((p, i) => `<div class="top-item ${i === 0 ? 'first' : ''}"><span>${i + 1}. ${p.name}</span><span>${p.score} b</span></div>`)
        .join('');

    document.getElementById('roundTopList').innerHTML = topHtml;
    document.getElementById('roundResults').classList.add('active');
    return new Promise(resolve => { roundResultsCallback = resolve; });
}

function closeRoundResults() {
    document.getElementById('roundResults').classList.remove('active');
    if (roundResultsCallback) roundResultsCallback();
    roundResultsCallback = null;
}

async function nextQuestion() {
    if (currentIndex + 1 >= currentQuestions.length) { endGame(); return; }
    currentIndex++;
    currentQuestion = currentQuestions[currentIndex];
    acceptingAnswers = true;
    answerSubmitted = false;

    await database.ref(`games/${gameId}/answers/${currentIndex}`).remove();
    await database.ref(`games/${gameId}/currentQuestion`).set({ index: currentIndex, question: currentQuestion });
    document.getElementById('nextQuestionBtn').style.display = 'none';
    displayHostQuestion();
}

async function endGame() {
    gameActive = false;
    if (revealTimer) clearTimeout(revealTimer);
    await database.ref(`games/${gameId}/status`).set('ended');

    const sorted = Object.values(players).sort((a, b) => (b.score || 0) - (a.score || 0));
    alert('🏆 Hra skončila! Víťaz: ' + (sorted[0]?.name || 'nikto'));

    await database.ref(`games/${gameId}`).remove();
    document.getElementById('startGameBtn').style.display = 'inline-block';
    document.getElementById('endGameBtn').style.display = 'none';
    document.getElementById('nextQuestionBtn').style.display = 'none';
    document.getElementById('questionText').innerHTML = 'Vyber kategórie a klikni Štart';
    document.getElementById('hostOptions').innerHTML = '';
    listenForLobby();
}

function toggleHostFullscreen() {
    const fs = document.getElementById('hostFullscreen');
    fs.classList.toggle('active');
    if (fs.classList.contains('active') && currentQuestion) {
        displayHostOptions('fsHostOptions', currentQuestion.options);
        document.getElementById('fsQuestionText').innerHTML = `${currentIndex + 1}. ${currentQuestion.question}`;
    }
}

// ===== Prezentujúci =====
function startPresenterTimer(seconds) {
    if (presenterTimerInterval) clearInterval(presenterTimerInterval);
    let remaining = seconds;
    const timerEl = document.getElementById('presTimer');
    timerEl.textContent = remaining;
    presenterTimerInterval = setInterval(() => {
        remaining--;
        timerEl.textContent = remaining >= 0 ? remaining : 0;
        if (remaining <= 0) clearInterval(presenterTimerInterval);
    }, 1000);
}

function togglePresenterFullscreen() {
    document.getElementById('presFullscreen').classList.toggle('active');
}

// ===== Hráč =====
function startPlayerTimer() {
    if (playerTimerInterval) clearInterval(playerTimerInterval);
    let remaining = 15;
    const timerEl = document.getElementById('gameTimer');
    timerEl.textContent = remaining;
    timerEl.classList.remove('warning');
    playerTimerInterval = setInterval(() => {
        remaining--;
        timerEl.textContent = remaining;
        if (remaining <= 5) timerEl.classList.add('warning');
        if (remaining <= 0) clearInterval(playerTimerInterval);
    }, 1000);
}

function stopPlayerTimer() {
    if (playerTimerInterval) clearInterval(playerTimerInterval);
}

function displayPlayerQuestion() {
    startPlayerTimer();
    document.getElementById('gameProgress').textContent = `Otázka ${playerCurrentIndex + 1} / ${totalQuestionsCount}`;
    document.getElementById('gameQuestionText').textContent = currentQuestion.question;

    const container = document.getElementById('gameAnswers');
    const letters = ['A', 'B', 'C', 'D'];
    container.innerHTML = currentQuestion.options.map((opt, i) => {
        const short = opt.length > 30 ? opt.substring(0, 27) + '...' : opt;
        return `<button class="game-ans-btn ans-btn-${letters[i]}" data-ans="${i}">
            <span class="ans-letter">${letters[i]}</span>
            <span class="ans-text">${short}</span>
        </button>`;
    }).join('');

    isMultiChoice = currentQuestion.type === 'multi';

    if (isMultiChoice) {
        document.querySelectorAll('.game-ans-btn').forEach(btn => {
            btn.onclick = () => {
                if (!acceptingAnswers || answerSubmitted) return;
                const val = parseInt(btn.dataset.ans);
                if (myAnswers.includes(val)) {
                    myAnswers = myAnswers.filter(v => v !== val);
                    btn.style.opacity = '0.7';
                } else {
                    myAnswers.push(val);
                    btn.style.opacity = '1';
                }
            };
        });

        let submitBtn = document.getElementById('multiSubmitBtn');
        if (!submitBtn) {
            submitBtn = document.createElement('button');
            submitBtn.id = 'multiSubmitBtn';
            submitBtn.className = 'btn';
            submitBtn.style.cssText = 'width:100%;margin-top:10px;grid-column:span 2';
            container.parentNode.appendChild(submitBtn);
        }
        submitBtn.textContent = '✅ Odoslať odpoveď';
        submitBtn.style.display = 'block';
        submitBtn.disabled = false;
        submitBtn.onclick = async () => {
            if (!acceptingAnswers || answerSubmitted) return;
            if (myAnswers.length === 0) { showPlayerFeedback('Vyber aspoň jednu odpoveď!', false); return; }
            answerSubmitted = true;
            const timeTaken = Date.now() - questionStartTime;
            await database.ref(`games/${gameId}/answers/${playerCurrentIndex}/${playerId}`).set({ answers: myAnswers, time: timeTaken });
            showPlayerFeedback('✅ Odpoveď zaznamenaná!', true);
            document.querySelectorAll('.game-ans-btn').forEach(b => b.disabled = true);
            submitBtn.disabled = true;
        };
    } else {
        const old = document.getElementById('multiSubmitBtn');
        if (old) old.remove();
        document.querySelectorAll('.game-ans-btn').forEach(btn => {
            btn.onclick = async () => {
                if (!acceptingAnswers || answerSubmitted) return;
                answerSubmitted = true;
                const timeTaken = Date.now() - questionStartTime;
                await database.ref(`games/${gameId}/answers/${playerCurrentIndex}/${playerId}`).set({ answer: parseInt(btn.dataset.ans), time: timeTaken });
                showPlayerFeedback('✅ Odpoveď zaznamenaná!', true);
                document.querySelectorAll('.game-ans-btn').forEach(b => b.disabled = true);
            };
        });
    }
}

function showPlayerFeedback(msg, isGood) {
    const fb = document.getElementById('gameFeedback');
    fb.textContent = msg;
    fb.className = `game-feedback show ${isGood ? 'correct' : 'wrong'}`;
    setTimeout(() => fb.classList.remove('show'), 2000);
}

function closeResults() {
    document.getElementById('resultsOverlay').classList.remove('active');
    location.reload();
}

function listenForPlayerGame() {
    database.ref(`games/${gameId}/currentQuestion`).on('value', (snap) => {
        const qData = snap.val();
        if (qData && playerCurrentIndex !== qData.index) {
            playerCurrentIndex = qData.index;
            currentQuestion = qData.question;
            acceptingAnswers = true;
            answerSubmitted = false;
            myAnswers = [];
            questionStartTime = Date.now();
            document.getElementById('gameWaiting').classList.remove('active');
            document.getElementById('gameFullscreen').classList.add('active');
            displayPlayerQuestion();
        }
    });

    database.ref(`games/${gameId}/questionDone`).on('value', (snap) => {
        const done = snap.val();
        if (done && done[playerCurrentIndex] === true && document.getElementById('gameFullscreen').classList.contains('active')) {
            stopPlayerTimer();
            document.getElementById('gameFullscreen').classList.remove('active');
            document.getElementById('gameWaiting').classList.add('active');
        }
    });

    database.ref(`games/${gameId}/status`).on('value', async (snap) => {
        if (snap.val() !== 'ended') return;
        stopPlayerTimer();
        const gameSnap = await database.ref(`games/${gameId}`).once('value');
        const playersData = gameSnap.val()?.players || {};
        const myData = playersData[playerId];
        const allPlayers = Object.values(playersData).sort((a, b) => (b.score || 0) - (a.score || 0));
        const rank = allPlayers.findIndex(p => p.name === myData?.name) + 1;

        document.getElementById('finalScore').textContent = `${myData?.score || 0} bodov`;
        document.getElementById('finalRank').innerHTML = `<p style="font-size:1.2rem">Tvoje umiestnenie: #${rank}</p>`;
        document.getElementById('resultsOverlay').classList.add('active');
        document.getElementById('gameFullscreen').classList.remove('active');
        document.getElementById('gameWaiting').classList.remove('active');
    });
}

// ===== DOMContentLoaded — napojenie event listenerov =====
document.addEventListener('DOMContentLoaded', () => {
    // Hostiteľ
    document.getElementById('startGameBtn')?.addEventListener('click', startGame);
    document.getElementById('nextQuestionBtn')?.addEventListener('click', nextQuestion);
    document.getElementById('endGameBtn')?.addEventListener('click', endGame);

    // Prezentujúci — pripojenie
    document.getElementById('presJoinBtn')?.addEventListener('click', async () => {
        const code = document.getElementById('presJoinCode').value.trim().toUpperCase();
        const name = document.getElementById('presName').value.trim();
        if (!code || !name) { alert('Zadaj kód miestnosti a svoje meno!'); return; }

        presenterGameId = code;
        const snap = await database.ref(`games/${presenterGameId}`).once('value');
        if (!snap.exists()) { alert('Hra neexistuje! Skontroluj kód.'); return; }

        presenterActive = true;
        document.getElementById('presJoinBtn').style.display = 'none';
        document.getElementById('presDisconnectBtn').style.display = 'inline-block';
        document.getElementById('presQuestionText').innerHTML = 'Sledovanie hry...';

        database.ref(`games/${presenterGameId}/currentQuestion`).on('value', (snap) => {
            const qData = snap.val();
            if (qData && presenterActive) {
                const q = qData.question;
                displayHostOptions('presOptions', q.options);
                displayHostOptions('presFsOptions', q.options);
                document.getElementById('presQuestionText').innerHTML = `${qData.index + 1}. ${q.question}`;
                document.getElementById('presFsQuestionText').innerHTML = `${qData.index + 1}. ${q.question}`;
                startPresenterTimer(15);
                document.querySelectorAll('#presOptions .opt-host-btn, #presFsOptions .opt-host-btn')
                    .forEach(btn => btn.classList.remove('correct-answer'));
            }
        });

        database.ref(`games/${presenterGameId}/questionDone`).on('value', async (snap) => {
            const done = snap.val();
            if (!done || !presenterActive) return;
            const qSnap = await database.ref(`games/${presenterGameId}/currentQuestion`).once('value');
            const qData = qSnap.val();
            if (qData) {
                const correctIndices = qData.question.correct;
                ['#presOptions', '#presFsOptions'].forEach(sel => {
                    const btns = document.querySelectorAll(`${sel} .opt-host-btn`);
                    correctIndices.forEach(c => { if (btns[c]) btns[c].classList.add('correct-answer'); });
                });
            }
            if (presenterTimerInterval) clearInterval(presenterTimerInterval);
            document.getElementById('presTimer').textContent = '✓';
        });

        database.ref(`games/${presenterGameId}/players`).on('value', (snap) => {
            const arr = Object.values(snap.val() || {}).sort((a, b) => (b.score || 0) - (a.score || 0));
            const html = arr.slice(0, 5).map((p, i) =>
                `<div class="player-item"><span>${i + 1}. ${p.name}</span><span>${p.score || 0} b</span></div>`
            ).join('') || '<div>Zatiaľ žiadni hráči</div>';
            document.getElementById('presLeaderboard').innerHTML = html;
            document.getElementById('presFsLeaderboard').innerHTML = html;
            document.getElementById('presStats').innerHTML = `Celkový počet hráčov: ${arr.length}`;
        });
    });

    // Prezentujúci — odpojenie
    document.getElementById('presDisconnectBtn')?.addEventListener('click', () => {
        presenterActive = false;
        if (presenterTimerInterval) clearInterval(presenterTimerInterval);
        document.getElementById('presJoinBtn').style.display = 'inline-block';
        document.getElementById('presDisconnectBtn').style.display = 'none';
        document.getElementById('presQuestionText').innerHTML = 'Zadaj kód miestnosti a klikni Pripojiť';
        ['presOptions', 'presFsOptions', 'presLeaderboard', 'presFsLeaderboard'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.innerHTML = '';
        });
        document.getElementById('presStats').innerHTML = 'Zatiaľ žiadne dáta';
    });

    // Hráč — pripojenie
    document.getElementById('joinGameBtn')?.addEventListener('click', async () => {
        const code = document.getElementById('joinCodeInput').value.toUpperCase();
        const name = document.getElementById('playerNameInput').value.trim();
        if (!code || !name) { alert('Zadaj kód a meno!'); return; }

        playerId = 'p_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
        gameId = code;

        const gameSnap = await database.ref(`games/${gameId}`).once('value');
        if (!gameSnap.exists() || gameSnap.val().status !== 'lobby') {
            alert('Hra neexistuje alebo už začala!');
            return;
        }
        totalQuestionsCount = gameSnap.val().totalQuestions || 10;
        await database.ref(`games/${gameId}/players/${playerId}`).set({ name, score: 0 });

        document.getElementById('joinScreen').style.display = 'none';
        document.getElementById('gameWaiting').classList.add('active');
        document.getElementById('gameFullscreen').classList.remove('active');
        listenForPlayerGame();
    });
});
