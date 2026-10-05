import { el } from './dom';
import { formatDate } from './format';

export const SPEEDS = [
  { label: '1 giờ/giây', days: 1 / 24 },
  { label: '6 giờ/giây', days: 0.25 },
  { label: '1 ngày/giây', days: 1 },
  { label: '1 tuần/giây', days: 7 },
  { label: '1 tháng/giây', days: 30 },
  { label: '1 năm/giây', days: 365 },
] as const;
export const DEFAULT_SPEED_INDEX = 2;

export type ToggleName = 'orbits' | 'labels' | 'trueScale';

export interface ToolbarHandlers {
  onTogglePause(): void;
  onSpeedChange(index: number): void;
  onToggle(name: ToggleName): void;
  onToday(): void;
  onReset(): void;
}

export class Toolbar {
  private readonly playButton: HTMLButtonElement;
  private readonly speedInput: HTMLInputElement;
  private readonly speedLabel: HTMLOutputElement;
  private readonly dateLabel: HTMLElement;
  private readonly toggles: Record<ToggleName, HTMLButtonElement>;
  private readonly help: HTMLElement;
  private lastDate = '';

  constructor(container: HTMLElement, handlers: ToolbarHandlers) {
    this.playButton = button('', 'Tạm dừng / chạy (Space)', handlers.onTogglePause);

    this.speedInput = el(
      'input',
      { type: 'range', className: 'toolbar__speed' },
      {
        min: '0',
        max: String(SPEEDS.length - 1),
        step: '1',
        'aria-label': 'Tốc độ thời gian',
      },
    );
    this.speedInput.addEventListener('input', () =>
      handlers.onSpeedChange(Number(this.speedInput.value)),
    );
    this.speedLabel = el('output', { className: 'toolbar__speed-label' });
    this.dateLabel = el('span', { className: 'toolbar__date' }, { title: 'Thời điểm mô phỏng' });

    const toggle = (name: ToggleName, text: string, title: string) =>
      button(text, title, () => handlers.onToggle(name), 'toggle');
    this.toggles = {
      orbits: toggle('orbits', 'Quỹ đạo', 'Hiện/ẩn quỹ đạo (O)'),
      labels: toggle('labels', 'Nhãn', 'Hiện/ẩn tên (L)'),
      trueScale: toggle('trueScale', 'Tỉ lệ thật', 'Chuyển tỉ lệ nén ↔ thật (T)'),
    };

    this.help = createHelp(() => this.toggleHelp(false));
    const helpButton = button('?', 'Hướng dẫn (H)', () => this.toggleHelp());
    helpButton.setAttribute('aria-label', 'Hướng dẫn');

    const bar = el(
      'div',
      { className: 'panel toolbar' },
      { role: 'toolbar', 'aria-label': 'Điều khiển' },
      [
        el('div', { className: 'toolbar__group' }, {}, [
          this.playButton,
          this.speedInput,
          this.speedLabel,
          this.dateLabel,
        ]),
        el('div', { className: 'toolbar__group' }, {}, [
          this.toggles.orbits,
          this.toggles.labels,
          this.toggles.trueScale,
          button('Hôm nay', 'Về thời điểm hiện tại', handlers.onToday),
          button('Toàn cảnh', 'Về góc nhìn toàn cảnh (R)', handlers.onReset),
          helpButton,
        ]),
      ],
    );
    container.append(bar, this.help);

    // Other panels position themselves above the toolbar, whose height
    // depends on how it wraps.
    new ResizeObserver(() => {
      document.documentElement.style.setProperty('--toolbar-height', `${bar.offsetHeight}px`);
    }).observe(bar);
  }

  setPaused(paused: boolean): void {
    this.playButton.textContent = paused ? '▶' : '❚❚';
    this.playButton.setAttribute('aria-label', paused ? 'Chạy' : 'Tạm dừng');
  }

  setSpeedIndex(index: number): void {
    this.speedInput.value = String(index);
    this.speedLabel.textContent = SPEEDS[index].label;
  }

  setToggle(name: ToggleName, on: boolean): void {
    this.toggles[name].setAttribute('aria-pressed', String(on));
  }

  setDate(date: Date): void {
    const text = formatDate(date);
    if (text !== this.lastDate) this.dateLabel.textContent = this.lastDate = text;
  }

  get helpOpen(): boolean {
    return !this.help.hidden;
  }

  toggleHelp(force?: boolean): void {
    this.help.hidden = !(force ?? this.help.hidden);
  }
}

function button(text: string, title: string, onClick: () => void, variant?: 'toggle') {
  const b = el('button', { type: 'button', className: 'button', textContent: text, title });
  if (variant === 'toggle') b.setAttribute('aria-pressed', 'false');
  b.addEventListener('click', onClick);
  return b;
}

function createHelp(onClose: () => void): HTMLElement {
  // Third column: keyboard-only rows, hidden on touch devices.
  const rows: [string, string, boolean?][] = [
    ['Kéo chuột trái / 1 ngón', 'Xoay góc nhìn'],
    ['Cuộn chuột / chụm 2 ngón', 'Zoom'],
    ['Chuột phải / kéo 2 ngón', 'Di chuyển (khi không bám theo thiên thể)'],
    ['Bấm vào thiên thể hoặc tên', 'Bay tới và xem thông tin'],
    ['0 – 9', 'Chọn Mặt Trời, hành tinh, Mặt Trăng', true],
    ['Space', 'Tạm dừng / chạy', true],
    ['+ / −', 'Tăng / giảm tốc độ', true],
    ['O · L · T', 'Quỹ đạo · Nhãn · Tỉ lệ thật', true],
    ['R', 'Về toàn cảnh', true],
    ['Esc', 'Bỏ chọn', true],
  ];
  const close = el(
    'button',
    { className: 'icon-button', type: 'button', textContent: '×' },
    {
      'aria-label': 'Đóng',
      title: 'Đóng (Esc)',
    },
  );
  close.addEventListener('click', onClose);
  const start = el('button', {
    className: 'button help__start',
    type: 'button',
    textContent: 'Bắt đầu khám phá',
  });
  start.addEventListener('click', onClose);
  const help = el(
    'section',
    { className: 'panel help' },
    { role: 'dialog', 'aria-label': 'Hướng dẫn' },
    [
      el('header', { className: 'help__header' }, {}, [
        el('h2', { textContent: 'Hướng dẫn' }),
        close,
      ]),
      el(
        'dl',
        {},
        {},
        rows.flatMap(([k, v, keyboard]) => {
          const className = keyboard ? 'is-keyboard' : '';
          return [el('dt', { className, textContent: k }), el('dd', { className, textContent: v })];
        }),
      ),
      start,
    ],
  );
  help.hidden = true;
  return help;
}
