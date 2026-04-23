<script>
  import { page } from '$app/stores';
  import { onMount } from 'svelte';

  const links = [
    ['/', '🏠 Hlavná'],
    ['/spravne-odpovede', '📚 Odpovede'],
    ['/kviz', '🎯 Kvíz'],
    ['/fejkhoot', '🎮 Fejkhoot'],
  ];

  let dark = true;

  onMount(() => {
    const saved = localStorage.getItem('theme');
    dark = saved ? saved === 'dark' : true;
    applyTheme();
  });

  function applyTheme() {
    document.documentElement.classList.toggle('light', !dark);
  }

  function toggleTheme() {
    dark = !dark;
    localStorage.setItem('theme', dark ? 'dark' : 'light');
    applyTheme();
  }
</script>

<header class="relative overflow-hidden border-b border-slate-700/50 bg-slate-900">
  <!-- Animated background grid -->
  <div class="absolute inset-0 pointer-events-none" aria-hidden="true">
    <div class="grid-anim"></div>
    <div class="orb orb-1"></div>
    <div class="orb orb-2"></div>
  </div>

  <div class="relative max-w-6xl mx-auto px-5 py-5">
    <div class="flex justify-end mb-3">
      <button on:click={toggleTheme}
        class="w-9 h-9 rounded-full bg-slate-700/80 border border-slate-600/50 hover:bg-blue-500 transition-all hover:scale-110"
        title="Prepnúť tému">
        {dark ? '🌙' : '☀️'}
      </button>
    </div>
    <div class="text-center">
      <slot />
      <nav class="flex flex-wrap justify-center gap-2 mt-4">
        {#each links as [href, label]}
          <a {href} class="px-4 py-1.5 rounded-full text-sm font-medium border transition-all
            {$page.url.pathname === href
              ? 'bg-blue-500 border-blue-500 text-white shadow-[0_0_12px_rgba(59,130,246,0.4)]'
              : 'bg-slate-700/50 border-slate-600/50 text-slate-300 hover:bg-blue-500 hover:text-white hover:border-blue-500'}">
            {label}
          </a>
        {/each}
      </nav>
    </div>
  </div>
</header>

<style>
  .grid-anim {
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(rgba(59,130,246,0.06) 1px, transparent 1px),
      linear-gradient(90deg, rgba(59,130,246,0.06) 1px, transparent 1px);
    background-size: 40px 40px;
    animation: grid-drift 20s linear infinite;
  }

  @keyframes grid-drift {
    0%   { transform: translateY(0); }
    100% { transform: translateY(40px); }
  }

  .orb {
    position: absolute;
    border-radius: 50%;
    filter: blur(60px);
    animation: orb-pulse 6s ease-in-out infinite alternate;
  }

  .orb-1 {
    width: 200px; height: 200px;
    background: rgba(59, 130, 246, 0.15);
    top: -60px; left: -40px;
    animation-delay: 0s;
  }

  .orb-2 {
    width: 160px; height: 160px;
    background: rgba(99, 102, 241, 0.12);
    top: -40px; right: -30px;
    animation-delay: 3s;
  }

  @keyframes orb-pulse {
    0%   { opacity: 0.6; transform: scale(1); }
    100% { opacity: 1;   transform: scale(1.2); }
  }

  /* Light theme overrides */
  :global(.light) header {
    background: #f1f5f9;
    border-color: #cbd5e1;
  }
  :global(.light) .grid-anim {
    background-image:
      linear-gradient(rgba(59,130,246,0.08) 1px, transparent 1px),
      linear-gradient(90deg, rgba(59,130,246,0.08) 1px, transparent 1px);
  }
</style>
