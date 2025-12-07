import { effect, signal } from '@html-props/signals';

export type ThemeMode = 'light' | 'dark' | 'system';

const DARK_THEME = {
  '--color-bg': '#121212',
  '--color-text': '#e4e4e7',
  '--color-accent': '#a78bfa',
  '--color-accent-hover': '#8b5cf6',
  '--color-secondary-bg': '#1e1e24',
  '--color-border': '#2e2e32',
  '--color-code-bg': '#050505',
  '--color-keyword': '#c678dd',
  '--color-class-name': '#e5c07b',
  '--color-function': '#61afef',
  '--color-string': '#98c379',
  '--color-number': '#d19a66',
  '--color-comment': '#5c6370',
  '--color-operator': '#56b6c2',
  '--color-property': '#e06c75',
};

const LIGHT_THEME = {
  '--color-bg': '#ffffff',
  '--color-text': '#09090b',
  '--color-accent': '#7c3aed',
  '--color-accent-hover': '#6d28d9',
  '--color-secondary-bg': '#f4f4f5',
  '--color-border': '#e4e4e7',
  '--color-code-bg': '#fafafa',
  '--color-keyword': '#a626a4',
  '--color-class-name': '#c18401',
  '--color-function': '#4078f2',
  '--color-string': '#50a14f',
  '--color-number': '#986801',
  '--color-comment': '#a0a1a7',
  '--color-operator': '#0184bc',
  '--color-property': '#e45649',
};

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
    const theme = isDark ? DARK_THEME : LIGHT_THEME;

    const root = document.documentElement;
    Object.entries(theme).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
  }
}
