// =====================================================================
// theme.js — Prepínanie svetlej/tmavej témy
// Importuj na každej stránke: <script src="js/theme.js"></script>
// Predpokladá: element s id="themeToggle" v HTML
// =====================================================================

function toggleTheme() {
    const body = document.body;
    body.classList.toggle('light-theme');
    const isLight = body.classList.contains('light-theme');
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
    document.getElementById('themeToggle').textContent = isLight ? '☀️' : '🌙';
}

// Načítaj uloženú tému hneď pri spustení
(function () {
    const saved = localStorage.getItem('theme');
    if (saved === 'light') {
        document.body.classList.add('light-theme');
    }
    // Ikona sa nastaví po DOMContentLoaded, lebo element ešte nemusí existovať
    document.addEventListener('DOMContentLoaded', () => {
        const toggle = document.getElementById('themeToggle');
        if (toggle) {
            toggle.textContent = document.body.classList.contains('light-theme') ? '☀️' : '🌙';
        }
    });
})();
