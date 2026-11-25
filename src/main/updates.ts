import type { UpdateCheckResult, UpdateInfo } from "electron-updater";

/** The subset of electron-updater's AppUpdater that MISO relies on. */
export interface Updater {
  autoDownload: boolean;
  autoInstallOnAppQuit: boolean;
  allowPrerelease: boolean;
  allowDowngrade: boolean;
  checkForUpdates(): Promise<UpdateCheckResult | null>;
  downloadUpdate(): Promise<unknown>;
  quitAndInstall(isSilent?: boolean, isForceRunAfter?: boolean): void;
  on(event: "error", listener: (error: Error) => void): unknown;
}

export interface PromptOptions {
  type: "info" | "question" | "warning";
  title: string;
  message: string;
  detail: string;
  buttons: string[];
  defaultId: number;
  cancelId: number;
}

export type UpdateState = "idle" | "checking" | "downloading" | "downloaded";

export interface UpdateServiceOptions {
  updater: Updater;
  currentVersion: string;
  /** Resolves with the index of the chosen button. */
  prompt: (options: PromptOptions) => Promise<number>;
  /** Background checks wait until the app is in normal use (onboarding complete). */
  ready: () => boolean;
  /** Runs immediately before quitAndInstall so window close handlers allow the quit. */
  beforeInstall: () => void;
  /** Called whenever the state changes, e.g. to rebuild the tray menu. */
  onChange?: () => void;
  initialDelayMs?: number;
  intervalMs?: number;
  log?: (message: string) => void;
}

const HOUR = 60 * 60 * 1000;

/**
 * Checks GitHub Releases for a newer MISO, asks before downloading, and asks
 * again before restarting. Background failures stay silent; checks the user
 * started report their outcome.
 */
export class UpdateService {
  private state: UpdateState = "idle";
  private downloaded?: UpdateInfo;
  private declined?: string;
  private firstCheck?: ReturnType<typeof setTimeout>;
  private periodic?: ReturnType<typeof setInterval>;
  private started = false;
  constructor(private readonly options: UpdateServiceOptions) {
    const { updater } = options;
    updater.autoDownload = false;
    // "Later" still installs the downloaded update when MISO quits.
    updater.autoInstallOnAppQuit = true;
    updater.allowPrerelease = false;
    updater.allowDowngrade = false;
    // An unhandled "error" event would throw; failures are handled per call.
    updater.on("error", (error) =>
      this.log(`Update error: ${error?.message ?? "unknown"}`),
    );
  }
  get status(): UpdateState {
    return this.state;
  }
  get pendingVersion(): string | undefined {
    return this.downloaded?.version;
  }
  start() {
    if (this.started) return;
    this.started = true;
    const background = () => void this.check(false);
    this.firstCheck = setTimeout(
      background,
      this.options.initialDelayMs ?? 30_000,
    );
    this.periodic = setInterval(
      background,
      this.options.intervalMs ?? 6 * HOUR,
    );
  }
  stop() {
    clearTimeout(this.firstCheck);
    clearInterval(this.periodic);
    this.firstCheck = this.periodic = undefined;
    this.started = false;
  }
  /** `manual` is true when the user asked from the tray. */
  async check(manual = false): Promise<void> {
    if (this.state === "downloaded") {
      if (manual) await this.promptInstall();
      return;
    }
    if (this.state !== "idle") {
      if (manual)
        await this.notify(
          "info",
          "Update in progress",
          this.state === "downloading"
            ? "MISO is already downloading an update."
            : "MISO is already checking for updates.",
          "You will be asked before MISO restarts.",
        );
      return;
    }
    if (!manual && !this.options.ready()) return;
    let userInitiated = manual;
    this.setState("checking");
    try {
      const result = await this.options.updater.checkForUpdates();
      const info = result?.isUpdateAvailable ? result.updateInfo : undefined;
      if (!info) {
        this.setState("idle");
        if (manual)
          await this.notify(
            "info",
            "MISO is up to date",
            "You have the latest version of MISO.",
            `Installed version: ${this.options.currentVersion}`,
          );
        return;
      }
      // Do not repeat a background prompt the user already postponed.
      if (!manual && this.declined === info.version) {
        this.setState("idle");
        return;
      }
      const choice = await this.options.prompt({
        type: "question",
        title: "MISO update available",
        message: `MISO ${info.version} is available.`,
        detail: `You have version ${this.options.currentVersion}. Download the update now? MISO keeps running while it downloads, and your accounts and settings are kept.`,
        buttons: ["Download", "Later"],
        defaultId: 0,
        cancelId: 1,
      });
      if (choice !== 0) {
        this.declined = info.version;
        this.setState("idle");
        return;
      }
      userInitiated = true;
      this.setState("downloading");
      await this.options.updater.downloadUpdate();
      this.downloaded = info;
      this.setState("downloaded");
      await this.promptInstall();
    } catch (error) {
      this.setState("idle");
      this.log(
        `Update failed: ${error instanceof Error ? error.message : "unknown"}`,
      );
      if (userInitiated)
        await this.notify(
          "warning",
          "Update unavailable",
          "MISO could not update right now.",
          "Check your internet connection and try again from the tray menu with Check for updates. You can also download the latest installer from MISO's website.",
        );
    }
  }
  private async promptInstall() {
    const version = this.downloaded?.version ?? "";
    const choice = await this.options.prompt({
      type: "question",
      title: "MISO update ready",
      message: `MISO ${version} is ready to install.`,
      detail:
        "Restart MISO now to finish updating. If you choose Later, the update installs the next time you quit MISO. Your accounts and settings are kept.",
      buttons: ["Restart now", "Later"],
      defaultId: 0,
      cancelId: 1,
    });
    if (choice !== 0) return;
    this.stop();
    this.options.beforeInstall();
    // Silent install, then relaunch MISO once the installer finishes.
    this.options.updater.quitAndInstall(true, true);
  }
  private async notify(
    type: PromptOptions["type"],
    title: string,
    message: string,
    detail: string,
  ) {
    await this.options.prompt({
      type,
      title,
      message,
      detail,
      buttons: ["OK"],
      defaultId: 0,
      cancelId: 0,
    });
  }
  private setState(state: UpdateState) {
    if (this.state === state) return;
    this.state = state;
    this.options.onChange?.();
  }
  private log(message: string) {
    this.options.log?.(message);
  }
}

/** Updates apply only to installed Windows builds outside verification runs. */
export function updatesSupported(input: {
  packaged: boolean;
  platform: NodeJS.Platform;
  smoke: boolean;
  isolatedProfile: boolean;
}): boolean {
  return (
    input.packaged &&
    input.platform === "win32" &&
    !input.smoke &&
    !input.isolatedProfile
  );
}
