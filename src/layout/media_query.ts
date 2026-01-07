import { batch, computed, type Signal, signal } from '@html-props/signals';

const hasWindow = typeof window !== 'undefined';

class MediaQueryService {
  readonly width: Signal<number> = signal(hasWindow ? (window.innerWidth || 1024) : 1024);
  readonly height: Signal<number> = signal(hasWindow ? (window.innerHeight || 768) : 768);
  readonly devicePixelRatio: Signal<number> = signal(hasWindow ? (window.devicePixelRatio || 1) : 1);

  readonly isMobile: Signal<boolean> = computed(() => this.width() < 768);
  readonly isTablet: Signal<boolean> = computed(() => this.width() >= 768 && this.width() < 1024);
  readonly isDesktop: Signal<boolean> = computed(() => this.width() >= 1024);

  constructor() {
    if (hasWindow) {
      window.addEventListener('resize', () => {
        batch(() => {
          this.width.set(window.innerWidth);
          this.height.set(window.innerHeight);
          this.devicePixelRatio.set(window.devicePixelRatio);
        });
      });
    }
  }
}

export const MediaQuery: MediaQueryService = new MediaQueryService();
