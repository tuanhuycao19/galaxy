import type { QualityLevel, QualityMode } from '../core/quality';
import { el } from './dom';
import { formatDate } from './format';

export const SPEEDS = [
  { label: 'Thời gian thực', days: 1 / 86_400 },
  { label: '1 giờ/giây', days: 1 / 24 },
  { label: '6 giờ/giây', days: 0.25 },
  { label: '1 ngày/giây', days: 1 },
  { label: '1 tuần/giây', days: 7 },
  { label: '1 tháng/giây', days: 30 },
  { label: '1 năm/giây', days: 365 },
] as const;
export const DEFAULT_SPEED_INDEX = 3;
/** Used on the beach so the light changes as slowly as in reality. */
export const REAL_TIME_SPEED_INDEX = 0;

export type ToggleName = 'orbits' | 'labels' | 'trueScale';

export interface ToolbarHandlers {
  onTogglePause(): void;
  onSpeedChange(index: number): void;
  onToggle(name: ToggleName): void;
  onToday(): void;
  onReset(): void;
  onQualityChange(mode: QualityMode): void;
}

const QUALITY_NAMES: Record<QualityMode, string> = {
  auto: 'Tự động',
  high: 'Cao',
  medium: 'Trung bình',
  low: 'Thấp',
};

export class Toolbar {
  private readonly playButton: HTMLButtonElement;
  private readonly speedInput: HTMLInputElement;
  private readonly speedLabel: HTMLOutputElement;
  private readonly dateLabel: HTMLElement;
  private readonly toggles: Record<ToggleName, HTMLButtonElement>;
  private readonly help: HTMLElement;
  private readonly qualitySelect: HTMLSelectElement;
  private readonly qualityStatus: HTMLElement;
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

    this.qualitySelect = el('select', { className: 'select' }, { id: 'quality-select' });
    for (const [mode, name] of Object.entries(QUALITY_NAMES)) {
      this.qualitySelect.append(el('option', { textContent: name }, { value: mode }));
    }
    this.qualitySelect.addEventListener('change', () =>
      handlers.onQualityChange(this.qualitySelect.value as QualityMode),
    );
    this.qualityStatus = el('span', { className: 'settings__status' });
    const settings = el('div', { className: 'settings' }, {}, [
      el('label', { textContent: 'Chất lượng đồ hoạ' }, { for: 'quality-select' }),
      this.qualitySelect,
      this.qualityStatus,
    ]);
    this.help = createHelp(settings, () => this.toggleHelp(false));
    const helpButton = button('?', 'Hướng dẫn & cài đặt (H)', () => this.toggleHelp());
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

  setQuality(mode: QualityMode, level: QualityLevel): void {
    this.qualitySelect.value = mode;
    this.qualityStatus.textContent = mode === 'auto' ? `Đang dùng: ${QUALITY_NAMES[level]}` : '';
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

function createHelp(settings: HTMLElement, onClose: () => void): HTMLElement {
  // Third column: keyboard-only rows, hidden on touch devices.
  const rows: [string, string, boolean?][] = [
    ['Kéo chuột trái / 1 ngón', 'Xoay góc nhìn'],
    ['Cuộn chuột / chụm 2 ngón', 'Zoom'],
    ['Chuột phải / kéo 2 ngón', 'Di chuyển (khi không bám theo thiên thể)'],
    ['Bấm vào thiên thể hoặc tên', 'Bay tới và xem thông tin'],
    ['Bấm "🏖 Gia đình" (trên Trái Đất)', 'Zoom xuống gia đình ở biển; zoom ra hết cỡ để quay lại'],
    ['0 – 9', 'Chọn Mặt Trời, hành tinh, Mặt Trăng', true],
    ['G', 'Zoom xuống gia đình ở biển Mỹ Khê', true],
    ['Space', 'Tạm dừng / chạy', true],
    ['+ / −', 'Tăng / giảm tốc độ', true],
    ['O · L · T', 'Quỹ đạo · Nhãn · Tỉ lệ thật', true],
    ['R', 'Về toàn cảnh', true],
    ['Q', 'Đổi chất lượng đồ hoạ', true],
    ['Esc', 'Bỏ chọn · từ bãi biển: quay lại không gian', true],
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
        el('h2', { textContent: 'Hướng dẫn & cài đặt' }),
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
      settings,
      start,
    ],
  );
  help.hidden = true;
  return help;
}
