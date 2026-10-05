import type { InfoSource } from '../objects/CelestialBody';
import { el } from './dom';

export interface ListEntry {
  source: InfoSource;
  /** Keyboard shortcut shown next to the name. */
  key: string;
  label?: string;
  /** Starts a new group with a divider above it. */
  separated?: boolean;
}

/** Quick-jump list of bodies (and places), each with its keyboard shortcut. */
export class BodyList {
  private readonly buttons = new Map<InfoSource, HTMLButtonElement>();

  constructor(
    container: HTMLElement,
    entries: readonly ListEntry[],
    onSelect: (source: InfoSource) => void,
  ) {
    const list = el('ul', { className: 'body-list__items' });
    for (const entry of entries) {
      const button = el('button', { className: 'body-list__button', type: 'button' }, {}, [
        el('kbd', { textContent: entry.key }),
        entry.label ?? entry.source.name,
      ]);
      button.addEventListener('click', () => onSelect(entry.source));
      this.buttons.set(entry.source, button);
      list.append(
        el('li', { className: entry.separated ? 'body-list__separated' : '' }, {}, [button]),
      );
    }
    container.appendChild(
      el('nav', { className: 'panel body-list' }, { 'aria-label': 'Thiên thể' }, [list]),
    );
  }

  setActive(source: InfoSource | null): void {
    for (const [s, button] of this.buttons) {
      button.setAttribute('aria-current', String(s === source));
    }
  }
}
