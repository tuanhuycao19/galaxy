import type { CelestialBody } from '../objects/CelestialBody';
import { el } from './dom';

/** Live-updating values (e.g. distance from the Sun) are refreshed at this interval. */
const REFRESH_SECONDS = 0.25;

export class InfoPanel {
  private readonly root: HTMLElement;
  private readonly title: HTMLElement;
  private readonly rows: HTMLElement;
  private readonly description: HTMLElement;
  private body: CelestialBody | null = null;
  private sinceRefresh = 0;

  constructor(container: HTMLElement, onClose: () => void) {
    this.title = el('h2', { className: 'info-panel__title' });
    const close = el(
      'button',
      { className: 'icon-button', type: 'button', textContent: '×' },
      {
        'aria-label': 'Đóng',
        title: 'Đóng (Esc)',
      },
    );
    close.addEventListener('click', onClose);
    this.rows = el('dl', { className: 'info-panel__rows' });
    this.description = el('p', { className: 'info-panel__description' });
    this.root = el('aside', { className: 'panel info-panel' }, { 'aria-live': 'polite' }, [
      el('header', { className: 'info-panel__header' }, {}, [this.title, close]),
      this.rows,
      this.description,
    ]);
    this.root.hidden = true;
    container.appendChild(this.root);
  }

  show(body: CelestialBody, days: number): void {
    this.body = body;
    this.title.textContent = body.name;
    this.description.textContent = body.description;
    this.renderRows(days);
    this.root.hidden = false;
  }

  hide(): void {
    this.body = null;
    this.root.hidden = true;
  }

  update(days: number, realSeconds: number): void {
    if (!this.body) return;
    this.sinceRefresh += realSeconds;
    if (this.sinceRefresh < REFRESH_SECONDS) return;
    this.sinceRefresh = 0;
    this.renderRows(days);
  }

  private renderRows(days: number): void {
    const rows = this.body!.info(days);
    // Rebuild only when the row set changes; otherwise just patch the values.
    if (this.rows.childElementCount !== rows.length * 2) {
      this.rows.replaceChildren(
        ...rows.flatMap((r) => [
          el('dt', { textContent: r.label }),
          el('dd', { textContent: r.value }),
        ]),
      );
      return;
    }
    rows.forEach((r, i) => {
      const dt = this.rows.children[i * 2];
      const dd = this.rows.children[i * 2 + 1];
      if (dt.textContent !== r.label) dt.textContent = r.label;
      if (dd.textContent !== r.value) dd.textContent = r.value;
    });
  }
}
