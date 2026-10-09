import { app, type BrowserWindow } from "electron";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
export async function capturePerformance(pet: BrowserWindow, output: string) {
  const visible = pet.isVisible();
  const results = [];
  for (const mode of ["visible", "hidden"] as const) {
    if (mode === "visible") pet.showInactive();
    else pet.hide();
    await wait(300);
    app.getAppMetrics();
    const samples = [];
    for (let i = 0; i < 3; i++) {
      await wait(500);
      samples.push(
        app.getAppMetrics().map((m) => ({
          type: m.type,
          cpuPercent: m.cpu.percentCPUUsage,
          workingSetMiB: m.memory.workingSetSize / 1024,
        })),
      );
    }
    results.push({
      mode,
      samples,
      averageSummedCpuPercent:
        samples.reduce(
          (sum, s) => sum + s.reduce((n, p) => n + p.cpuPercent, 0),
          0,
        ) / samples.length,
      averageSummedWorkingSetMiB:
        samples.reduce(
          (sum, s) => sum + s.reduce((n, p) => n + p.workingSetMiB, 0),
          0,
        ) / samples.length,
    });
  }
  if (visible) pet.showInactive();
  else pet.hide();
  const label =
    process.env.BUTLER_PROFILE_LABEL === "before" ? "before" : "after";
  await writeFile(
    join(output, `performance-${label}.json`),
    JSON.stringify(
      {
        environment:
          "Electron smoke: mocked Google accounts, hidden Settings window, three 500ms samples per mode. Summed working sets can double-count shared pages. Short samples are noisy; not a production benchmark.",
        electron: process.versions.electron,
        platform: process.platform,
        results,
      },
      null,
      2,
    ),
  );
}
