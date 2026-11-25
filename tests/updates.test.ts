import { it, expect, vi, afterEach } from "vitest";
import {
  UpdateService,
  updatesSupported,
  type PromptOptions,
  type Updater,
} from "../src/main/updates";

function fakeUpdater(available: string | undefined) {
  const updater = {
    autoDownload: true,
    autoInstallOnAppQuit: false,
    allowPrerelease: true,
    allowDowngrade: true,
    checkForUpdates: vi.fn(async () =>
      available
        ? ({
            isUpdateAvailable: true,
            updateInfo: { version: available },
          } as any)
        : ({
            isUpdateAvailable: false,
            updateInfo: { version: "1.0.0" },
          } as any),
    ),
    downloadUpdate: vi.fn(async () => ["installer.exe"]),
    quitAndInstall: vi.fn(),
    on: vi.fn(),
  } satisfies Updater;
  return updater;
}
function service(
  updater: Updater,
  answers: number[],
  overrides: { ready?: () => boolean } = {},
) {
  const prompts: PromptOptions[] = [];
  const beforeInstall = vi.fn();
  const onChange = vi.fn();
  const instance = new UpdateService({
    updater,
    currentVersion: "1.0.0",
    prompt: async (options) => {
      prompts.push(options);
      return answers.shift() ?? options.cancelId;
    },
    ready: overrides.ready ?? (() => true),
    beforeInstall,
    onChange,
  });
  return { instance, prompts, beforeInstall, onChange };
}
afterEach(() => vi.useRealTimers());

it("configures the updater to ask before downloading", () => {
  const updater = fakeUpdater(undefined);
  service(updater, []);
  expect(updater.autoDownload).toBe(false);
  expect(updater.autoInstallOnAppQuit).toBe(true);
  expect(updater.allowPrerelease).toBe(false);
  expect(updater.allowDowngrade).toBe(false);
  expect(updater.on).toHaveBeenCalledWith("error", expect.any(Function));
});

it("downloads after consent and restarts only when the user agrees", async () => {
  const updater = fakeUpdater("1.1.0");
  const { instance, prompts, beforeInstall } = service(updater, [0, 0]);
  await instance.check(false);
  expect(prompts.map((p) => p.message)).toEqual([
    "MISO 1.1.0 is available.",
    "MISO 1.1.0 is ready to install.",
  ]);
  expect(updater.downloadUpdate).toHaveBeenCalledOnce();
  expect(beforeInstall).toHaveBeenCalledOnce();
  expect(updater.quitAndInstall).toHaveBeenCalledWith(true, true);
});

it("does not download when the user postpones, and stays quiet afterwards", async () => {
  const updater = fakeUpdater("1.1.0");
  const { instance, prompts } = service(updater, [1]);
  await instance.check(false);
  expect(updater.downloadUpdate).not.toHaveBeenCalled();
  await instance.check(false);
  expect(prompts).toHaveLength(1);
  expect(instance.status).toBe("idle");
});

it("keeps a downloaded update for install on quit when restart is postponed", async () => {
  const updater = fakeUpdater("1.1.0");
  const { instance, prompts } = service(updater, [0, 1, 0]);
  await instance.check(false);
  expect(updater.quitAndInstall).not.toHaveBeenCalled();
  expect(instance.status).toBe("downloaded");
  expect(instance.pendingVersion).toBe("1.1.0");
  // A manual check offers the restart again without downloading twice.
  await instance.check(true);
  expect(updater.downloadUpdate).toHaveBeenCalledOnce();
  expect(prompts.at(-1)?.message).toBe("MISO 1.1.0 is ready to install.");
  expect(updater.quitAndInstall).toHaveBeenCalledOnce();
});

it("reports the result of a manual check but not of a background one", async () => {
  const updater = fakeUpdater(undefined);
  const background = service(updater, []);
  await background.instance.check(false);
  expect(background.prompts).toHaveLength(0);
  const manual = service(updater, []);
  await manual.instance.check(true);
  expect(manual.prompts.map((p) => p.title)).toEqual(["MISO is up to date"]);
});

it("hides background failures and reports user-initiated ones", async () => {
  const updater = fakeUpdater(undefined);
  updater.checkForUpdates.mockRejectedValue(new Error("offline"));
  const background = service(updater, []);
  await expect(background.instance.check(false)).resolves.toBeUndefined();
  expect(background.prompts).toHaveLength(0);
  expect(background.instance.status).toBe("idle");
  const manual = service(updater, []);
  await manual.instance.check(true);
  expect(manual.prompts.map((p) => p.title)).toEqual(["Update unavailable"]);
});

it("reports a failed download the user agreed to", async () => {
  const updater = fakeUpdater("1.1.0");
  updater.downloadUpdate.mockRejectedValue(new Error("sha512 mismatch"));
  const { instance, prompts } = service(updater, [0]);
  await instance.check(false);
  expect(prompts.map((p) => p.title)).toEqual([
    "MISO update available",
    "Update unavailable",
  ]);
  expect(instance.status).toBe("idle");
  expect(updater.quitAndInstall).not.toHaveBeenCalled();
});

it("waits for onboarding before background checks", async () => {
  const updater = fakeUpdater("1.1.0");
  let ready = false;
  const { instance } = service(updater, [], { ready: () => ready });
  await instance.check(false);
  expect(updater.checkForUpdates).not.toHaveBeenCalled();
  ready = true;
  await instance.check(false);
  expect(updater.checkForUpdates).toHaveBeenCalledOnce();
});

it("ignores overlapping checks", async () => {
  const updater = fakeUpdater(undefined);
  let finish!: () => void;
  updater.checkForUpdates.mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = () => resolve(null);
      }),
  );
  const { instance, prompts } = service(updater, []);
  const first = instance.check(false);
  await instance.check(true);
  expect(prompts.map((p) => p.title)).toEqual(["Update in progress"]);
  finish();
  await first;
  expect(updater.checkForUpdates).toHaveBeenCalledOnce();
});

it("schedules a startup check and periodic checks until stopped", async () => {
  vi.useFakeTimers();
  const updater = fakeUpdater(undefined);
  const instance = new UpdateService({
    updater,
    currentVersion: "1.0.0",
    prompt: async () => 0,
    ready: () => true,
    beforeInstall: () => {},
    initialDelayMs: 1000,
    intervalMs: 5000,
  });
  instance.start();
  instance.start();
  await vi.advanceTimersByTimeAsync(1000);
  expect(updater.checkForUpdates).toHaveBeenCalledTimes(1);
  await vi.advanceTimersByTimeAsync(5000);
  expect(updater.checkForUpdates).toHaveBeenCalledTimes(2);
  instance.stop();
  await vi.advanceTimersByTimeAsync(20000);
  expect(updater.checkForUpdates).toHaveBeenCalledTimes(2);
});

it("enables updates only for installed Windows builds outside verification", () => {
  const base = {
    packaged: true,
    platform: "win32" as const,
    smoke: false,
    isolatedProfile: false,
  };
  expect(updatesSupported(base)).toBe(true);
  expect(updatesSupported({ ...base, packaged: false })).toBe(false);
  expect(updatesSupported({ ...base, platform: "darwin" })).toBe(false);
  expect(updatesSupported({ ...base, smoke: true })).toBe(false);
  expect(updatesSupported({ ...base, isolatedProfile: true })).toBe(false);
});
