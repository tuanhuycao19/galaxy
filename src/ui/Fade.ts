/** Full-screen haze used to hide the jump between space and the ground scene. */
export class Fade {
  private readonly element: HTMLElement;

  constructor(container: HTMLElement) {
    this.element = document.createElement('div');
    this.element.className = 'fade';
    container.appendChild(this.element);
  }

  /** Bright haze by day, deep blue at night, so landing at night doesn't flash white. */
  setNight(night: boolean): void {
    this.element.classList.toggle('fade--night', night);
  }

  set(opacity: number): void {
    this.element.style.opacity = String(opacity);
  }
}
