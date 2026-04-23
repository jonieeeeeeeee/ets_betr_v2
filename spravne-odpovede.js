// =====================================================================
// spravne-odpovede.js — Logika stránky Správne odpovede
// Závisí od: questions.js (questionsDatabase)
// =====================================================================

// ===== Odpovede =====
function renderAnswers(testType, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const questions = questionsDatabase[testType];
    if (!questions || questions.length === 0) {
        container.innerHTML = '<div class="no-pdfs"><div class="icon">📭</div><p>Žiadne otázky k dispozícii</p></div>';
        return;
    }

    container.innerHTML = questions.map((q, i) => `
        <div class="answer-item">
            <div class="answer-question">${i + 1}. ${q.question}</div>
            <div class="answer-options">
                ${q.options.map((opt, idx) => {
                    const correct = q.correct.includes(idx);
                    return `
                        <div class="answer-option ${correct ? 'correct-answer' : ''}">
                            <div class="answer-marker ${correct ? 'correct' : ''}">${correct ? '✓' : String.fromCharCode(65 + idx)}</div>
                            <span>${String.fromCharCode(65 + idx)}) ${opt}</span>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `).join('');
}

function showAnswersTab(testType) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    document.querySelectorAll('.answers-content').forEach(el => el.classList.remove('active'));
    document.getElementById(`answers${testType}`).classList.add('active');
}

// ===== PDF manažér =====
let pdfFiles = [];

const permanentPDFs = [
    { name: '📘 Zhrnutie A',           url: 'pdfka/Zhrnutie-A.pdf' },
    { name: '📗 Zhrnutie B',           url: 'pdfka/Zhrnutie-B.pdf' },
    { name: '📕 Zhrnutie C',           url: 'pdfka/Zhrnutie-C.pdf' },
    { name: '📙 Zhrnutie D',           url: 'pdfka/Zhrnutie-D.pdf' },
    { name: '📓 Zhrnutie Legislatíva', url: 'pdfka/Zhrnutie-leg.pdf' }
];

function loadSavedPDFs() {
    const saved = localStorage.getItem('pdfFiles');
    if (saved) pdfFiles = JSON.parse(saved);
    renderPdfLists();
}

function savePDFs() {
    localStorage.setItem('pdfFiles', JSON.stringify(pdfFiles));
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function renderPdfLists() {
    // Trvalé PDF
    document.getElementById('permanentPdfList').innerHTML = permanentPDFs.map(pdf => `
        <div class="pdf-card">
            <div class="pdf-icon">📄</div>
            <div class="pdf-info">
                <div class="pdf-name">${pdf.name}</div>
                <div class="pdf-size">Trvalý materiál</div>
            </div>
            <div class="pdf-actions">
                <button class="pdf-btn" onclick="window.open('${pdf.url}', '_blank')">🔍</button>
            </div>
        </div>
    `).join('');

    // Používateľské PDF
    const userContainer = document.getElementById('userPdfList');
    if (pdfFiles.length === 0) {
        userContainer.innerHTML = `
            <div class="no-pdfs">
                <div class="icon">📭</div>
                <p>Žiadne nahrané súbory</p>
                <p style="font-size:.8rem">Nahrajte vlastné PDF vyššie</p>
            </div>
        `;
    } else {
        userContainer.innerHTML = pdfFiles.map((pdf, i) => `
            <div class="pdf-card">
                <div class="pdf-icon">📄</div>
                <div class="pdf-info">
                    <div class="pdf-name">${pdf.name}</div>
                    <div class="pdf-size">${pdf.size}</div>
                </div>
                <div class="pdf-actions">
                    <button class="pdf-btn" onclick="openPDF(${i})">🔍</button>
                    <button class="pdf-btn delete" onclick="deletePDF(${i})">🗑️</button>
                </div>
            </div>
        `).join('');
    }
}

function openPDF(index) {
    const pdf = pdfFiles[index];
    if (!pdf?.data) return;
    const bytes = Uint8Array.from(atob(pdf.data), c => c.charCodeAt(0));
    const blob = new Blob([bytes], { type: 'application/pdf' });
    window.open(URL.createObjectURL(blob), '_blank');
}

function deletePDF(index) {
    if (confirm('Naozaj chcete vymazať tento súbor?')) {
        pdfFiles.splice(index, 1);
        savePDFs();
        renderPdfLists();
    }
}

function handleFileUpload(files) {
    Array.from(files).forEach(file => {
        if (file.type !== 'application/pdf') {
            alert('Prosím, nahrajte iba PDF súbory.');
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            pdfFiles.push({
                name: file.name,
                size: formatFileSize(file.size),
                data: e.target.result.split(',')[1],
                lastModified: file.lastModified
            });
            savePDFs();
            renderPdfLists();
        };
        reader.readAsDataURL(file);
    });
}

// ===== Inicializácia =====
document.addEventListener('DOMContentLoaded', () => {
    loadSavedPDFs();
    ['A', 'B', 'C', 'D', 'LEG'].forEach(t => renderAnswers(t, `answersList${t}`));

    const uploadArea = document.getElementById('uploadArea');
    const fileInput  = document.getElementById('fileInput');

    uploadArea.addEventListener('dragover', (e) => e.preventDefault());
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        handleFileUpload(e.dataTransfer.files);
    });
    fileInput.addEventListener('change', (e) => {
        handleFileUpload(e.target.files);
        fileInput.value = '';
    });
});
