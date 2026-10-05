/** Full-screen haze used to hide the jump between space and the ground scene. */
export class Fade {
  private readonly element: HTMLElement;

  constructor(container: HTMLElement) {
    this.element = document.createElement('div');
    this.element.className = 'fade';
    container.appendChild(this.element);
  }

  set(opacity: number): void {
    this.element.style.opacity = String(opacity);
  }
}
