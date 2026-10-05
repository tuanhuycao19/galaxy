import type { CelestialBody } from '../objects/CelestialBody';
import { el } from './dom';

/** Quick-jump list; `bodies[i]` is also reachable with keyboard key `i`. */
export class BodyList {
  private readonly buttons = new Map<CelestialBody, HTMLButtonElement>();

  constructor(
    container: HTMLElement,
    bodies: readonly CelestialBody[],
    onSelect: (body: CelestialBody) => void,
  ) {
    const list = el('ul', { className: 'body-list__items' });
    bodies.forEach((body, i) => {
      const button = el('button', { className: 'body-list__button', type: 'button' }, {}, [
        el('kbd', { textContent: String(i) }),
        body.name,
      ]);
      button.addEventListener('click', () => onSelect(body));
      this.buttons.set(body, button);
      list.append(el('li', {}, {}, [button]));
    });
    container.appendChild(
      el('nav', { className: 'panel body-list' }, { 'aria-label': 'Thiên thể' }, [list]),
    );
  }

  setActive(body: CelestialBody | null): void {
    for (const [b, button] of this.buttons) {
      button.setAttribute('aria-current', String(b === body));
    }
  }
}
