import { dateToJ2000Days, j2000DaysToDate } from '../physics/time';

/** Simulated time, in days since J2000, advanced by real frame time. */
export class SimulationClock {
  days: number;
  /** Simulated days per real second. */
  timeScale = 1;
  paused = false;

  constructor(start = new Date()) {
    this.days = dateToJ2000Days(start);
  }

  advance(realSeconds: number): void {
    if (!this.paused) this.days += realSeconds * this.timeScale;
  }

  get date(): Date {
    return j2000DaysToDate(this.days);
  }

  resetToNow(): void {
    this.days = dateToJ2000Days(new Date());
  }
}
