export interface ShortcutHandlers {
  selectIndex(index: number): void;
  togglePause(): void;
  faster(): void;
  slower(): void;
  toggleOrbits(): void;
  toggleLabels(): void;
  toggleScale(): void;
  toggleHelp(): void;
  reset(): void;
  cycleQuality(): void;
  goToSite(): void;
  escape(): void;
}

/**
 * Global shortcuts. Form fields keep their own keys, and a focused button
 * keeps Space/Enter (its native activation); everything else stays global.
 */
export function bindShortcuts(h: ShortcutHandlers): void {
  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const target = e.target as HTMLElement | null;
    if (e.key !== 'Escape') {
      if (target?.closest('input, select, textarea')) return;
      if (target?.closest('button') && (e.key === ' ' || e.key === 'Enter')) return;
    }

    const handled = dispatch(e.key, h);
    if (handled) e.preventDefault();
  });
}

function dispatch(key: string, h: ShortcutHandlers): boolean {
  if (/^[0-9]$/.test(key)) {
    h.selectIndex(Number(key));
    return true;
  }
  switch (key) {
    case ' ':
      h.togglePause();
      return true;
    case '+':
    case '=':
      h.faster();
      return true;
    case '-':
    case '_':
      h.slower();
      return true;
    case 'o':
    case 'O':
      h.toggleOrbits();
      return true;
    case 'l':
    case 'L':
      h.toggleLabels();
      return true;
    case 't':
    case 'T':
      h.toggleScale();
      return true;
    case 'h':
    case 'H':
    case '?':
      h.toggleHelp();
      return true;
    case 'r':
    case 'R':
      h.reset();
      return true;
    case 'g':
    case 'G':
      h.goToSite();
      return true;
    case 'q':
    case 'Q':
      h.cycleQuality();
      return true;
    case 'Escape':
      h.escape();
      return true;
    default:
      return false;
  }
}
