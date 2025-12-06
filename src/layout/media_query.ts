import { computed, signal } from '@html-props/signals';

const hasWindow = typeof window !== 'undefined';

class MediaQueryService {
  readonly width = signal(hasWindow ? window.innerWidth : 1024);
  readonly height = signal(hasWindow ? window.innerHeight : 768);
  readonly devicePixelRatio = signal(hasWindow ? window.devicePixelRatio : 1);

  readonly isMobile = computed(() => this.width() < 768);
  readonly isTablet = computed(() => this.width() >= 768 && this.width() < 1024);
  readonly isDesktop = computed(() => this.width() >= 1024);

  constructor() {
    if (hasWindow) {
      window.addEventListener('resize', () => {
        this.width.set(window.innerWidth);
        this.height.set(window.innerHeight);
        this.devicePixelRatio.set(window.devicePixelRatio);
      });
    }
  }
}

export const MediaQuery = new MediaQueryService();
