import type { PetState } from "../shared/types";

export const IDLE_POSE_INTERVAL = 15_000;
const poses: PetState[] = ["idle", "happy", "sleep"];

export class IdlePoseCycle {
  private timer: ReturnType<typeof setTimeout> | undefined;
  private index = 0;
  private running = false;
  constructor(private onPose: (pose: PetState) => void) {}
  get enabled() {
    return this.running;
  }
  setEnabled(enabled: boolean) {
    if (enabled === this.running) return;
    this.running = enabled;
    if (this.timer) clearTimeout(this.timer);
    this.timer = undefined;
    if (!enabled) {
      if (this.index !== 0) {
        this.index = 0;
        this.onPose("idle");
      }
      return;
    }
    this.schedule();
  }
  private schedule() {
    if (!this.running) return;
    this.timer = setTimeout(() => {
      this.timer = undefined;
      this.index = (this.index + 1) % poses.length;
      this.onPose(poses[this.index]);
      this.schedule();
    }, IDLE_POSE_INTERVAL);
  }
  dispose() {
    this.setEnabled(false);
  }
}
