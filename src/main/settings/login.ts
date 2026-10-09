import { app } from "electron";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import { join, isAbsolute } from "node:path";
function desktopQuote(value: string) {
  return (
    '"' + value.replace(/[%\\"`$]/g, (c) => (c === "%" ? "%%" : "\\" + c)) + '"'
  );
}
export async function setStartAtLogin(enabled: boolean) {
  const args = app.isPackaged ? [] : [app.getAppPath()];
  if (process.platform !== "linux") {
    app.setLoginItemSettings({
      openAtLogin: enabled,
      path: process.execPath,
      args,
    });
    return;
  }
  const config =
    process.env.XDG_CONFIG_HOME && isAbsolute(process.env.XDG_CONFIG_HOME)
      ? process.env.XDG_CONFIG_HOME
      : join(app.getPath("home"), ".config");
  const directory = join(config, "autostart");
  const target = join(directory, "butler.desktop");
  if (!enabled) {
    try {
      await unlink(target);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    return;
  }
  const executable =
    process.env.APPIMAGE && isAbsolute(process.env.APPIMAGE)
      ? process.env.APPIMAGE
      : process.execPath;
  const command = [executable, ...args].map(desktopQuote).join(" ");
  await mkdir(directory, { recursive: true });
  await writeFile(
    target,
    `[Desktop Entry]\nType=Application\nName=MISO\nComment=MISO - Your Little Butler\nExec=${command}\nTerminal=false\nX-GNOME-Autostart-enabled=true\n`,
    { mode: 0o600 },
  );
}
