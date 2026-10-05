import { el } from './dom';

/** Big centred title shown during the zoom ("Châu Á", "Việt Nam", …). */
export class CaptionView {
  private readonly root: HTMLElement;
  private readonly title: HTMLElement;
  private readonly subtitle: HTMLElement;
  private current = '';

  constructor(container: HTMLElement) {
    this.title = el('div', { className: 'caption__title' });
    this.subtitle = el('div', { className: 'caption__subtitle' });
    this.root = el('div', { className: 'caption' }, { 'aria-live': 'polite' }, [
      this.title,
      this.subtitle,
    ]);
    container.appendChild(this.root);
  }

  show(title: string, subtitle: string): void {
    if (title === this.current) return;
    this.current = title;
    // Fade out, swap text, fade back in.
    this.root.classList.remove('is-visible');
    window.setTimeout(
      () => {
        if (this.current !== title) return;
        this.title.textContent = title;
        this.subtitle.textContent = subtitle;
        this.root.classList.add('is-visible');
      },
      this.title.textContent ? 450 : 0,
    );
  }

  hide(): void {
    this.current = '';
    this.root.classList.remove('is-visible');
  }
}
