/** Give up waiting and show the scene anyway after this long. */
const TIMEOUT_MS = 20_000;
const FADE_MS = 600;

/**
 * Controls the loading overlay that ships in index.html (so it shows
 * before any JavaScript runs).
 */
export class LoadingScreen {
  private readonly root: HTMLElement | null = document.getElementById('loading');
  private readonly fill = this.root?.querySelector<HTMLElement>('.loading__fill');
  private readonly text = this.root?.querySelector<HTMLElement>('.loading__text');
  private readonly timeout: number;
  private finished = false;

  constructor(onTimeout: () => void) {
    this.timeout = window.setTimeout(onTimeout, TIMEOUT_MS);
  }

  setProgress(loaded: number, total: number): void {
    if (this.finished || !this.fill || !this.text) return;
    this.fill.style.transform = `scaleX(${total > 0 ? loaded / total : 0})`;
    this.text.textContent = `Đang tải dữ liệu… ${loaded}/${total}`;
  }

  setMessage(message: string): void {
    if (this.text) this.text.textContent = message;
  }

  finish(): void {
    if (this.finished) return;
    this.finished = true;
    window.clearTimeout(this.timeout);
    document.documentElement.dataset.ready = 'true';
    if (!this.root) return;
    this.root.classList.add('is-done');
    window.setTimeout(() => this.root?.remove(), FADE_MS);
  }

  fail(message: string): void {
    this.finished = true;
    window.clearTimeout(this.timeout);
    this.root?.classList.add('is-error');
    this.setMessage(message);
  }
}
