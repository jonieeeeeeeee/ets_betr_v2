<script>
  import { page } from '$app/stores';
  const links = [
    ['/', '🏠 Hlavná'],
    ['/spravne-odpovede', '📚 Odpovede'],
    ['/kviz', '🎯 Kvíz'],
    ['/fejkhoot', '🎮 Fejkhoot'],
  ];
  let dark = true;
  function toggleTheme() {
    dark = !dark;
    document.documentElement.style.background = dark ? '' : '#f8fafc';
    document.documentElement.style.color = dark ? '' : '#0f172a';
  }
</script>

<header class="bg-slate-800 border-b border-slate-700/50">
  <div class="max-w-6xl mx-auto px-5 py-4">
    <div class="flex justify-end mb-3">
      <button on:click={toggleTheme}
        class="w-9 h-9 rounded-full bg-slate-700 border border-slate-600 hover:bg-blue-500 transition-colors">
        {dark ? '🌙' : '☀️'}
      </button>
    </div>
    <div class="text-center">
      <slot />
      <nav class="flex flex-wrap justify-center gap-2 mt-4">
        {#each links as [href, label]}
          <a {href} class="px-4 py-1.5 rounded-full text-sm font-medium border transition-all
            {$page.url.pathname === href
              ? 'bg-blue-500 border-blue-500 text-white'
              : 'bg-slate-700/50 border-slate-600/50 text-slate-300 hover:bg-blue-500 hover:text-white hover:border-blue-500'}">
            {label}
          </a>
        {/each}
      </nav>
    </div>
  </div>
</header>
