import { effect, signal } from '@html-props/signals';

export type ThemeMode = 'light' | 'dark' | 'system';

export class ThemeService {
  private static instance: ThemeService;

  // Signal to track current mode preference
  public mode = signal<ThemeMode>('system');

  // Signal to track actual applied theme (light or dark)
  public currentTheme = signal<'light' | 'dark'>('dark');

  private constructor() {
    // Load saved preference
    const saved = localStorage.getItem('theme-preference') as ThemeMode;
    if (saved) {
      this.mode.set(saved);
    }

    // Listen for system changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', () => this.updateTheme());

    // Update theme when mode changes
    effect(() => {
      this.updateTheme();
      localStorage.setItem('theme-preference', this.mode());
    });
  }

  static getInstance() {
    if (!this.instance) {
      this.instance = new ThemeService();
    }

    return this.instance;
  }

  toggle() {
    const modes: ThemeMode[] = ['light', 'dark', 'system'];
    const nextIndex = (modes.indexOf(this.mode()) + 1) % modes.length;
    this.mode.set(modes[nextIndex]);
  }

  setMode(mode: ThemeMode) {
    this.mode.set(mode);
  }

  private updateTheme() {
    const mode = this.mode();
    let isDark = false;

    if (mode === 'system') {
      isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    } else {
      isDark = mode === 'dark';
    }

    this.currentTheme.set(isDark ? 'dark' : 'light');

    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }
}
