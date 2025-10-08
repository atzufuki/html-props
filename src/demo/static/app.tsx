import HTMLProps, { createRef } from '@html-props/core';

const Div = HTMLProps(HTMLDivElement)<{}>().define('html-div', {
  extends: 'div',
});

interface MyElementProps extends HTMLElement {
  text?: string;
  textColor?: string;
}

class MyElement extends HTMLProps(HTMLElement)<MyElementProps>() {
  text?: string;
  textColor?: string;

  getDefaultProps() {
    return {
      text: 'Default text',
      style: {
        display: 'block',
        padding: '1rem',
        backgroundColor: 'lightgray',
        color: this.props.textColor ?? 'blue',
      },
    };
  }

  render() {
    return (
      <Div>
        {this.props.content}
      </Div>
    );
  }
}

MyElement.define('my-element');

interface CatCardProps extends HTMLElement {
  imageUrl?: string;
  name?: string;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
}

class CatCard extends HTMLProps(HTMLElement)<CatCardProps>() {
  static get observedAttributes() {
    return ['imageUrl', 'name'];
  }

  imageUrl!: string;
  name!: string;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  containerRef = createRef<HTMLDivElement>(null);
  isDragging = false;
  startX = 0;
  currentX = 0;

  get refs() {
    return {
      container: this.containerRef.current,
    };
  }

  getDefaultProps() {
    return {
      style: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '300px',
        height: '400px',
        borderRadius: '10px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        backgroundColor: '#fff',
        overflow: 'hidden',
        position: 'relative',
        touchAction: 'none',
      },
      onmousedown: (event: MouseEvent) => {
        this.isDragging = true;
        this.startX = event.clientX;
        this.style.transition = 'none';
      },
      onmousemove: (event: MouseEvent) => {
        if (!this.isDragging) return;
        this.currentX = event.clientX;
        const translateX = this.currentX - this.startX;
        this.style.transform = `translateX(${translateX}px)`;
      },
      onmouseup: () => {
        if (!this.isDragging) return;
        this.isDragging = false;
        const translateX = this.currentX - this.startX;
        this.style.transition = 'transform 0.3s ease';

        if (translateX > 100) {
          this.style.transform = 'translateX(100vw)';
          setTimeout(() => this.props.onSwipeRight?.(), 300);
        } else if (translateX < -100) {
          this.style.transform = 'translateX(-100vw)';
          setTimeout(() => this.props.onSwipeLeft?.(), 300);
        } else {
          this.style.transform = 'translateX(0)';
        }
      },
      onmouseleave: () => {
        if (!this.isDragging) return;
        this.isDragging = false;
        this.style.transition = 'transform 0.3s ease';
        this.style.transform = 'translateX(0)';
      },
      ontouchstart: (event: TouchEvent) => {
        this.isDragging = true;
        this.startX = event.touches[0].clientX;
        this.style.transition = 'none';
      },
      ontouchmove: (event: TouchEvent) => {
        if (!this.isDragging) return;
        this.currentX = event.touches[0].clientX;
        const translateX = this.currentX - this.startX;
        this.style.transform = `translateX(${translateX}px)`;
      },
      ontouchend: () => {
        if (!this.isDragging) return;
        this.isDragging = false;
        const translateX = this.currentX - this.startX;
        this.style.transition = 'transform 0.3s ease';

        if (translateX > 100) {
          this.style.transform = 'translateX(100vw)';
          setTimeout(() => this.props.onSwipeRight?.(), 300);
        } else if (translateX < -100) {
          this.style.transform = 'translateX(-100vw)';
          setTimeout(() => this.props.onSwipeLeft?.(), 300);
        } else {
          this.style.transform = 'translateX(0)';
        }
      },
    };
  }

  render() {
    return (
      <Div
        ref={this.containerRef}
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          touchAction: 'none',
        }}
      >
        <Div
          style={{
            width: '100%',
            height: '80%',
            backgroundImage: `url(${this.imageUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            pointerEvents: 'none',
          }}
        />
        <Div
          style={{
            width: '100%',
            height: '20%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px',
            fontWeight: 'bold',
            color: '#333',
            pointerEvents: 'none',
          }}
          textContent={this.name}
        />
      </Div>
    );
  }
}

CatCard.define('cat-card');

class App extends HTMLProps(HTMLElement)() {
  catIndex = 0;
  cats = [
    { imageUrl: 'https://placecats.com/300/400', name: 'Fluffy' },
    { imageUrl: 'https://placecats.com/301/400', name: 'Whiskers' },
    { imageUrl: 'https://placecats.com/302/400', name: 'Mittens' },
  ];

  getDefaultProps() {
    return {
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100vw',
        height: '100vh',
        backgroundColor: '#f0f0f0',
        overflow: 'hidden',
      },
    };
  }

  handleSwipe(direction: 'left' | 'right') {
    const appContainer = document.querySelector('#app-container');
    const card = appContainer?.querySelector('cat-card') as CatCard;

    if (card) {
      const translateX = direction === 'left' ? '-100vw' : '100vw';
      card.style.transition = 'transform 0.3s ease';
      card.style.transform = `translateX(${translateX})`;

      setTimeout(() => {
        console.log(`Swiped ${direction} on ${this.cats[this.catIndex].name}`);
        this.catIndex = (this.catIndex + 1) % this.cats.length;
        this.updateDOM();
      }, 300);
    }
  }

  updateDOM() {
    const appContainer = document.querySelector('#app-container');
    if (appContainer) {
      const buttons = appContainer.querySelectorAll('div[style*="position: absolute"]');
      appContainer.innerHTML = '';
      const currentCat = this.cats[this.catIndex];
      appContainer.appendChild(
        new CatCard({
          imageUrl: currentCat.imageUrl,
          name: currentCat.name,
          onSwipeLeft: () => this.handleSwipe('left'),
          onSwipeRight: () => this.handleSwipe('right'),
        }),
      );
      buttons.forEach((button) => appContainer.appendChild(button));
    }
  }

  connectedCallback() {
    super.connectedCallback?.();
    this.updateDOM();
  }

  render() {
    return (
      <Div
        id='app-container'
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          width: '100%',
          height: '100%',
        }}
      >
        <CatCard
          imageUrl={this.cats[this.catIndex].imageUrl}
          name={this.cats[this.catIndex].name}
          onSwipeLeft={() => this.handleSwipe('left')}
          onSwipeRight={() => this.handleSwipe('right')}
        />
        <Div
          style={{
            position: 'absolute',
            bottom: '20px',
            display: 'flex',
            gap: '20px',
          }}
        >
          <Div
            style={{
              width: '50px',
              height: '50px',
              borderRadius: '50%',
              backgroundColor: '#ff6b6b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#9f4545',
            }}
            innerHTML='<span class="material-symbols-outlined">close</span>'
            onclick={() => this.handleSwipe('left')}
          />
          <Div
            style={{
              width: '50px',
              height: '50px',
              borderRadius: '50%',
              backgroundColor: '#4caf50',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#328134',
            }}
            innerHTML='<span class="material-symbols-outlined">favorite</span>'
            onclick={() => this.handleSwipe('right')}
          />
        </Div>
      </Div>
    );
  }
}

App.define('my-app');

document.body.appendChild(new App({}));
