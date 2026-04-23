// =====================================================================
// test-engine.js — Logika testovania (index.html)
// Závisí od: questions.js (questionsDatabase)
// =====================================================================

const testConfigs = {
    'A':   { name: 'Test A - Elektrotechnické merania', time: 40, desc: 'Elektrotechnické merania, ochranné opatrenia, bleskozvody, izolácia, uzemnenie' },
    'B':   { name: 'Test B - Ochranné opatrenia',       time: 35, desc: 'Meranie a skúšanie ochrany, ochranné vodiče, uzemnenie, siete TT, TN, chrániče' },
    'C':   { name: 'Test C - Bezpečnosť práce',         time: 50, desc: 'Bezpečnostné predpisy, PPN, príkazy B, B-PPN, ochranné pomôcky, vonkajšie vplyvy' },
    'D':   { name: 'Test D - Prvá pomoc',               time: 25, desc: 'Úrazy elektrickým prúdom, oživovanie, krvácanie, popáleniny, stabilizovaná poloha' },
    'LEG': { name: 'Test Legislatíva',                  time: 50, desc: 'Vyhláška 508/2009, TI, IBP, odborná spôsobilosť, skúšky, dokumentácia, prevádzka' },
    'MIX': { name: 'Testový test - Zmiešaný',           time: 45, desc: 'Zmiešané otázky zo všetkých testov' }
};

// ===== Stav testu =====
let currentTest = null;
let currentQuestions = [];
let currentQuestionIndex = 0;
let userAnswers = [];
let timeLeft = 0;
let timerInterval = null;

// ===== Spustenie testu =====
function startTest(testType) {
    if (!questionsDatabase[testType] || questionsDatabase[testType].length === 0) {
        alert('Test nie je dostupný. Prosím, doplňte otázky do databázy.');
        return;
    }

    currentTest = testType;
    currentQuestions = [...questionsDatabase[testType]].sort(() => Math.random() - 0.5);
    userAnswers = new Array(currentQuestions.length).fill(null);
    timeLeft = testConfigs[testType].time * 60;

    document.getElementById('currentTestName').textContent = testConfigs[testType].name;
    document.getElementById('currentTestDescription').textContent = testConfigs[testType].desc;

    _switchView('mainPage', 'testPage');
    currentQuestionIndex = 0;
    _renderAll();
    _startTimer();
}

// ===== Mix test =====
function openMixModal() {
    document.getElementById('countDModal').textContent = questionsDatabase.D.length;
    document.getElementById('countLEGModal').textContent = questionsDatabase.LEG.length;
    document.getElementById('mixModal').style.display = 'flex';
}

function closeMixModal() {
    document.getElementById('mixModal').style.display = 'none';
}

function startMixTest() {
    const questionCount = parseInt(document.getElementById('mixQuestionCount').value);
    const timeLimit = parseInt(document.getElementById('mixTimeLimit').value);

    const checkboxMap = [
        { id: 'includeA', key: 'A' },
        { id: 'includeB', key: 'B' },
        { id: 'includeC', key: 'C' },
        { id: 'includeD', key: 'D' },
        { id: 'includeLEG', key: 'LEG' }
    ];

    let allQuestions = [];
    checkboxMap.forEach(({ id, key }) => {
        if (document.getElementById(id).checked && questionsDatabase[key]?.length > 0) {
            allQuestions.push(...questionsDatabase[key]);
        }
    });

    if (allQuestions.length === 0) {
        alert('Vyberte aspoň jeden test s otázkami!');
        return;
    }

    allQuestions.sort(() => Math.random() - 0.5);
    currentQuestions = allQuestions.slice(0, Math.min(questionCount, allQuestions.length));
    currentTest = 'MIX';
    userAnswers = new Array(currentQuestions.length).fill(null);
    timeLeft = timeLimit * 60;

    document.getElementById('currentTestName').textContent = 'Testový test - Zmiešaný';
    document.getElementById('currentTestDescription').textContent =
        `${currentQuestions.length} otázok z ${allQuestions.length} dostupných`;

    closeMixModal();
    _switchView('mainPage', 'testPage');
    currentQuestionIndex = 0;
    _renderAll();
    _startTimer();
}

// ===== Navigácia v otázkach =====
function goToQuestion(index) {
    currentQuestionIndex = index;
    _renderQuestion();
    _renderNavigation();
}

function prevQuestion() {
    if (currentQuestionIndex > 0) goToQuestion(currentQuestionIndex - 1);
}

function nextQuestion() {
    if (currentQuestionIndex < currentQuestions.length - 1) goToQuestion(currentQuestionIndex + 1);
}

function selectOption(index) {
    const q = currentQuestions[currentQuestionIndex];

    if (q.type === 'single') {
        userAnswers[currentQuestionIndex] = [index];
    } else {
        if (!userAnswers[currentQuestionIndex]) userAnswers[currentQuestionIndex] = [];
        const pos = userAnswers[currentQuestionIndex].indexOf(index);
        if (pos === -1) userAnswers[currentQuestionIndex].push(index);
        else userAnswers[currentQuestionIndex].splice(pos, 1);
    }

    _renderQuestion();
    _renderNavigation();
    _updateProgress();
}

// ===== Odovzdanie =====
function submitTest() {
    clearInterval(timerInterval);

    let score = 0;
    const details = currentQuestions.map((q, i) => {
        const userAns = userAnswers[i] || [];
        const isCorrect = _checkAnswer(q, userAns);
        if (isCorrect) score++;
        return {
            question: q.question,
            user: userAns.length ? userAns.map(a => String.fromCharCode(65 + a)).join(', ') : 'Nezodpovedané',
            correct: q.correct.map(a => String.fromCharCode(65 + a)).join(', '),
            isCorrect
        };
    });

    _showResults(score, details);
}

function restartTest() {
    closeResults();
    userAnswers = new Array(currentQuestions.length).fill(null);
    currentQuestions = currentTest === 'MIX'
        ? [...currentQuestions].sort(() => Math.random() - 0.5)
        : [...questionsDatabase[currentTest]].sort(() => Math.random() - 0.5);
    currentQuestionIndex = 0;
    timeLeft = testConfigs[currentTest].time * 60;
    _renderAll();
    _startTimer();
}

function goHome() {
    closeResults();
    clearInterval(timerInterval);
    _switchView('testPage', 'mainPage');
}

function closeResults() {
    document.getElementById('resultsModal').style.display = 'none';
}

// ===== Interné pomocné funkcie =====
function _switchView(hideId, showId) {
    document.getElementById(hideId).style.display = 'none';
    document.getElementById(showId).style.display = 'block';
}

function _renderAll() {
    _renderNavigation();
    _renderQuestion();
    _updateProgress();
}

function _renderNavigation() {
    const nav = document.getElementById('questionNav');
    nav.innerHTML = '';
    currentQuestions.forEach((_, i) => {
        const item = document.createElement('div');
        item.className = 'nav-item' +
            (i === currentQuestionIndex ? ' current' : '') +
            (userAnswers[i] !== null ? ' answered' : '');
        item.textContent = i + 1;
        item.onclick = () => goToQuestion(i);
        nav.appendChild(item);
    });
}

function _renderQuestion() {
    const q = currentQuestions[currentQuestionIndex];
    if (!q) return;

    document.getElementById('questionNumber').textContent =
        `Otázka ${currentQuestionIndex + 1} z ${currentQuestions.length}`;
    document.getElementById('questionText').textContent = q.question;

    const container = document.getElementById('optionsContainer');
    container.innerHTML = '';

    q.options.forEach((opt, i) => {
        const isChecked = userAnswers[currentQuestionIndex]?.includes(i) || false;
        const div = document.createElement('div');
        div.className = `option${isChecked ? ' selected' : ''}`;
        div.innerHTML = `
            <input type="${q.type === 'single' ? 'radio' : 'checkbox'}"
                   name="opt" value="${i}" ${isChecked ? 'checked' : ''}>
            <span class="option-label">${String.fromCharCode(65 + i)}) ${opt}</span>
        `;
        div.onclick = (e) => {
            if (e.target.tagName !== 'INPUT') {
                const input = div.querySelector('input');
                if (input.type === 'radio') input.checked = true;
                else input.checked = !input.checked;
            }
            selectOption(i);
        };
        container.appendChild(div);
    });

    const isLast = currentQuestionIndex === currentQuestions.length - 1;
    document.getElementById('prevBtn').disabled = currentQuestionIndex === 0;
    document.getElementById('nextBtn').style.display = isLast ? 'none' : 'inline-block';
    document.getElementById('submitBtn').style.display = isLast ? 'inline-block' : 'none';
}

function _updateProgress() {
    const answered = userAnswers.filter(a => a !== null).length;
    document.getElementById('progress').style.width =
        `${(answered / currentQuestions.length) * 100}%`;
}

function _startTimer() {
    clearInterval(timerInterval);
    _updateTimerDisplay();
    timerInterval = setInterval(() => {
        if (timeLeft > 0) {
            timeLeft--;
            _updateTimerDisplay();
        } else {
            clearInterval(timerInterval);
            submitTest();
        }
    }, 1000);
}

function _updateTimerDisplay() {
    const m = String(Math.floor(timeLeft / 60)).padStart(2, '0');
    const s = String(timeLeft % 60).padStart(2, '0');
    document.getElementById('timer').textContent = `${m}:${s}`;
}

function _checkAnswer(q, userAns) {
    if (!userAns || userAns.length === 0) return false;
    if (q.type === 'single') return userAns.length === 1 && userAns[0] === q.correct[0];
    if (userAns.length !== q.correct.length) return false;
    return [...userAns].sort().every((v, i) => v === [...q.correct].sort()[i]);
}

function _showResults(score, details) {
    const total = currentQuestions.length;
    const percent = Math.round((score / total) * 100);

    let msg, color;
    if (percent >= 90)      { msg = 'Výborný! 🎉';              color = '#10b981'; }
    else if (percent >= 75) { msg = 'Dobrý! 👍';                color = '#3b82f6'; }
    else if (percent >= 50) { msg = 'Priemerný 📊';             color = '#f59e0b'; }
    else                    { msg = 'Treba viac trénovať 📚';   color = '#ef4444'; }

    document.getElementById('resultsContainer').innerHTML = `
        <div class="score-circle" style="background: conic-gradient(${color} 0deg ${percent * 3.6}deg, var(--surface-light) ${percent * 3.6}deg 360deg);">
            <div class="score-inner">
                <div class="score-value">${score}</div>
                <div class="score-total">/ ${total}</div>
            </div>
        </div>
        <div class="result-message" style="color: ${color};">${msg}</div>
        <p style="font-size: 1.2rem; margin-bottom: 20px;">Úspešnosť: <strong>${percent}%</strong></p>

        <div class="detailed-results">
            <h3 style="margin-bottom: 15px;">Podrobné výsledky:</h3>
            ${details.map((d, i) => `
                <div class="result-item ${d.isCorrect ? '' : 'incorrect'}">
                    <strong>${i + 1}.</strong> ${d.question}<br>
                    <span style="color: ${d.isCorrect ? '#10b981' : '#ef4444'};">
                        ${d.isCorrect ? '✓' : '✗'} Vaša odpoveď: ${d.user}<br>
                        ${!d.isCorrect ? `Správna odpoveď: ${d.correct}` : ''}
                    </span>
                </div>
            `).join('')}
        </div>

        <div style="margin-top: 30px; display: flex; gap: 10px; justify-content: center;">
            <button class="btn" onclick="restartTest()">🔄 Znova</button>
            <button class="btn" onclick="goHome()">🏠 Domov</button>
        </div>
    `;

    document.getElementById('resultsModal').style.display = 'flex';
}

// ===== Klávesové skratky =====
document.addEventListener('keydown', (e) => {
    if (document.getElementById('testPage').style.display !== 'block') return;
    if (e.key === 'ArrowLeft') prevQuestion();
    else if (e.key === 'ArrowRight') nextQuestion();
    else if (/^[1-6]$/.test(e.key)) {
        const idx = parseInt(e.key) - 1;
        if (currentQuestions[currentQuestionIndex]?.options[idx] !== undefined) selectOption(idx);
    }
});
