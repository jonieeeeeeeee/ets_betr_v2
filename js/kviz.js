// =====================================================================
// kviz.js — Logika kvízu "Strel odpoveď"
// Závisí od: questions.js (questionsDatabase)
// =====================================================================

let currentQuestions = [];
let userAnswers = [];   // single: číslo, multi: pole čísel
let answerStatus = [];
let currentIndex = 0;
let totalQuestions = 0;
let quizFinished = false;

// DOM referencie — inicializujeme po DOMContentLoaded
let setupPanel, quizPanel, resultPanel;
let startBtn, prevBtn, nextBtn, checkBtn, submitBtn, questionContainer;

document.addEventListener('DOMContentLoaded', () => {
    setupPanel       = document.getElementById('setupPanel');
    quizPanel        = document.getElementById('quizPanel');
    resultPanel      = document.getElementById('resultPanel');
    startBtn         = document.getElementById('startQuizBtn');
    prevBtn          = document.getElementById('prevBtn');
    nextBtn          = document.getElementById('nextBtn');
    checkBtn         = document.getElementById('checkBtn');
    submitBtn        = document.getElementById('submitBtn');
    questionContainer = document.getElementById('questionContainer');

    // ===== Spustenie kvízu =====
    startBtn.addEventListener('click', () => {
        const selectedTest = document.getElementById('testSelect').value;
        const requestedCount = parseInt(document.getElementById('questionCount').value);
        const available = questionsDatabase[selectedTest];

        if (!available || available.length === 0) {
            alert('Žiadne otázky pre vybraný test.');
            return;
        }

        totalQuestions = Math.min(requestedCount, available.length);
        const shuffled = [...available].sort(() => Math.random() - 0.5);
        currentQuestions = shuffled.slice(0, totalQuestions);
        userAnswers  = new Array(totalQuestions).fill(null);
        answerStatus = new Array(totalQuestions).fill(null);
        currentIndex = 0;
        quizFinished = false;

        _renderQuestion();
        setupPanel.style.display  = 'none';
        quizPanel.style.display   = 'block';
        resultPanel.style.display = 'none';
        _updateNavButtons();
    });

    // ===== Navigácia =====
    prevBtn.addEventListener('click', () => {
        if (currentIndex > 0 && !quizFinished) {
            currentIndex--;
            _renderQuestion();
            _updateNavButtons();
        }
    });

    nextBtn.addEventListener('click', () => {
        if (answerStatus[currentIndex] === null) {
            alert('Najprv skontroluj odpoveď tlačidlom "Skontrolovať"!');
            return;
        }
        if (currentIndex < totalQuestions - 1) {
            currentIndex++;
            _renderQuestion();
            _updateNavButtons();
        }
    });

    checkBtn.addEventListener('click', () => {
        if (!quizFinished) _checkAnswer();
    });

    submitBtn.addEventListener('click', () => {
        if (quizFinished) return;
        if (!answerStatus.every(s => s !== null)) {
            alert('Najprv skontroluj všetky otázky!');
            return;
        }
        _showFinalResults();
    });
});

// ===== Interné funkcie =====
function _renderQuestion() {
    if (!currentQuestions.length || quizFinished) return;
    const q = currentQuestions[currentIndex];
    const isMulti = q.type === 'multi';
    const saved = userAnswers[currentIndex];

    let html = `
        <div class="question-card">
            <div class="question-header">
                <span class="question-counter">Otázka ${currentIndex + 1} / ${totalQuestions}</span>
                <span class="question-type">${isMulti ? '✅ Viac správnych' : '🔘 Jedna správna'}</span>
                <div class="progress-bar">
                    <div class="progress-fill" style="width:${(currentIndex / totalQuestions) * 100}%"></div>
                </div>
            </div>
            <div class="question-text">${q.question}</div>
            <div class="options-list">
    `;

    q.options.forEach((opt, idx) => {
        const isSelected = isMulti
            ? (Array.isArray(saved) && saved.includes(idx))
            : (saved === idx);

        html += `
            <div class="option ${isSelected ? 'selected' : ''}" data-opt-index="${idx}">
                ${isMulti
                    ? `<div class="option-checkbox ${isSelected ? 'checked' : ''}">${isSelected ? '✓' : ''}</div>`
                    : `<div class="option-letter">${String.fromCharCode(65 + idx)}</div>`}
                <div class="option-text">${String.fromCharCode(65 + idx)}) ${opt}</div>
            </div>
        `;
    });

    html += '</div>';

    // Zobraziť spätnú väzbu ak už bola skontrolovaná
    if (answerStatus[currentIndex] !== null) {
        const isCorrect = answerStatus[currentIndex];
        const correctLetters = q.correct.map(i => String.fromCharCode(65 + i)).join(', ');
        const userText = isMulti
            ? (Array.isArray(saved) ? saved.map(i => String.fromCharCode(65 + i)).join(', ') : 'žiadna')
            : (saved !== null ? String.fromCharCode(65 + saved) : 'žiadna');

        html += `
            <div class="feedback ${isCorrect ? 'correct' : 'wrong'}">
                <div class="feedback-title">${isCorrect ? '✓ Správne!' : '✗ Nesprávne'}</div>
                <div>Tvoja odpoveď: ${userText}</div>
                <div class="correct-answer">Správna: ${correctLetters}) ${q.correct.map(i => q.options[i]).join(', ')}</div>
            </div>
        `;
    }

    html += '</div>';
    questionContainer.innerHTML = html;

    // Klik na možnosti
    questionContainer.querySelectorAll('.option').forEach(optDiv => {
        optDiv.addEventListener('click', (e) => {
            e.stopPropagation();
            if (answerStatus[currentIndex] !== null || quizFinished) return;

            const idx = parseInt(optDiv.dataset.optIndex);
            if (q.type === 'multi') {
                let cur = Array.isArray(userAnswers[currentIndex]) ? [...userAnswers[currentIndex]] : [];
                const pos = cur.indexOf(idx);
                if (pos === -1) cur.push(idx);
                else cur.splice(pos, 1);
                userAnswers[currentIndex] = cur;
            } else {
                userAnswers[currentIndex] = idx;
            }
            _renderQuestion();
        });
    });
}

function _checkAnswer() {
    if (answerStatus[currentIndex] !== null) {
        alert('Túto otázku už máš skontrolovanú!');
        return;
    }

    const q = currentQuestions[currentIndex];
    const ans = userAnswers[currentIndex];

    if (ans === null || (Array.isArray(ans) && ans.length === 0)) {
        alert('Najprv označ nejakú odpoveď!');
        return;
    }

    let isCorrect = false;
    if (q.type === 'multi') {
        if (Array.isArray(ans) && ans.length === q.correct.length) {
            isCorrect = JSON.stringify([...ans].sort()) === JSON.stringify([...q.correct].sort());
        }
    } else {
        isCorrect = q.correct.includes(ans);
    }

    answerStatus[currentIndex] = isCorrect;
    _renderQuestion();
    _updateNavButtons();
}

function _updateNavButtons() {
    if (quizFinished) return;

    prevBtn.disabled = (currentIndex === 0);
    const isAnswered = answerStatus[currentIndex] !== null;
    const isLast = currentIndex === totalQuestions - 1;

    nextBtn.style.display   = (!isLast) ? 'inline-block' : 'none';
    submitBtn.style.display = (isLast && isAnswered) ? 'inline-block' : 'none';
}

function _showFinalResults() {
    quizFinished = true;
    const correctCount = answerStatus.filter(Boolean).length;
    const pct = Math.round((correctCount / totalQuestions) * 100);

    let html = `
        <h2>📊 Konečné výsledky</h2>
        <div class="final-score">${correctCount} / ${totalQuestions} (${pct}%)</div>
        <div class="summary">
    `;

    currentQuestions.forEach((q, i) => {
        const ans = userAnswers[i];
        const userLetter = q.type === 'multi' && Array.isArray(ans)
            ? ans.map(a => String.fromCharCode(65 + a)).join(', ')
            : (ans !== null ? String.fromCharCode(65 + ans) : '?');
        const correctLetters = q.correct.map(c => String.fromCharCode(65 + c)).join(', ');

        html += `
            <div class="summary-item ${answerStatus[i] ? 'correct' : ''}">
                <strong>${i + 1}. ${q.question}</strong><br>
                <span style="color:var(--text-secondary)">Tvoja odpoveď: ${userLetter}</span><br>
                <span style="color:var(--success)">Správne: ${correctLetters}</span>
            </div>
        `;
    });

    html += `</div><button class="btn" id="restartQuizBtn">🔄 Nový kvíz</button>`;
    resultPanel.innerHTML = html;
    quizPanel.style.display   = 'none';
    resultPanel.style.display = 'block';

    document.getElementById('restartQuizBtn')?.addEventListener('click', () => {
        setupPanel.style.display  = 'block';
        resultPanel.style.display = 'none';
        quizFinished = false;
    });
}
