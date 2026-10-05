import GUI from 'lil-gui';
import type { SimulationClock } from '../core/SimulationClock';

const SPEEDS: Record<string, number> = {
  '1 giờ / giây': 1 / 24,
  '1 ngày / giây': 1,
  '1 tuần / giây': 7,
  '1 tháng / giây': 30,
  '1 năm / giây': 365,
};

const dateFormat = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' });

/**
 * Temporary lil-gui panel for the simulation controls; replaced by the
 * real toolbar in phase 3.
 */
export class ControlPanel {
  private readonly gui = new GUI({ title: 'Điều khiển' });
  private readonly state = { date: '', showOrbits: true };

  constructor(clock: SimulationClock, onToggleOrbits: (visible: boolean) => void) {
    this.gui.add(this.state, 'date').name('Ngày').disable().listen();
    this.gui.add(clock, 'paused').name('Tạm dừng');
    this.gui.add(clock, 'timeScale', SPEEDS).name('Tốc độ');
    this.gui.add({ now: () => clock.resetToNow() }, 'now').name('Về hôm nay');
    this.gui.add(this.state, 'showOrbits').name('Quỹ đạo').onChange(onToggleOrbits);
  }

  update(date: Date): void {
    this.state.date = dateFormat.format(date);
  }
}
