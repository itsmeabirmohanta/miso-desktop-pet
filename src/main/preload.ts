import { contextBridge, ipcRenderer } from "electron";
import type { ButlerAPI } from "../shared/types";
function subscribe(channel: string, fn: (data: any) => void) {
  const handler = (_: unknown, data: unknown) => fn(data);
  ipcRenderer.on(channel, handler);
  return () => ipcRenderer.removeListener(channel, handler);
}
async function invoke(channel: string, ...args: unknown[]) {
  const result = await ipcRenderer.invoke(channel, ...args);
  if (!result.ok) throw new Error(result.error);
  return result.value;
}
const api: ButlerAPI = {
  snapshot: () => invoke("snapshot"),
  command: (text) => invoke("command", text),
  choose: (id) => invoke("choose", id),
  save: (settings, secrets) => invoke("save", settings, secrets),
  connect: () => invoke("connect"),
  disconnect: () => invoke("disconnect"),
  sync: () => invoke("sync"),
  testAI: () => invoke("test-ai"),
  finishSetup: () => invoke("finish-setup"),
  help: (topic, provider) => invoke("help", topic, provider),
  removeAccount: (id) => invoke("remove-account", id),
  resetSetup: () => invoke("reset-setup"),
  restoreDefaultOAuth: () => invoke("restore-default-oauth"),
  createManual: (input) => invoke("create-manual", input),
  previewDelete: (calendarId, eventId, scope) =>
    invoke("preview-delete", calendarId, eventId, scope),
  confirmDelete: (ticket) => invoke("confirm-delete", ticket),
  cancelDelete: (ticket) => invoke("cancel-delete", ticket),
  getCalendarEvent: (c, e) => invoke("get-calendar-event", c, e),
  openCalendarEvent: (c, e) => invoke("open-calendar-event", c, e),
  previewEdit: (c, e, v) => invoke("preview-edit", c, e, v),
  confirmEdit: (t) => invoke("confirm-edit", t),
  cancelEdit: (t) => invoke("cancel-edit", t),
  snooze: (key, minutes) => invoke("snooze", key, minutes),
  done: (key) => invoke("done", key),
  settings: () => invoke("settings"),
  interactive: (value) => ipcRenderer.send("interactive", value),
  move: (x, y) => ipcRenderer.send("move", x, y),
  beginQuick: () => invoke("begin-quick"),
  endQuick: () => invoke("end-quick"),
  dragging: (value) => ipcRenderer.send("dragging", value),
  onPetLayout: (fn) => subscribe("pet-layout", fn),
  regions: (rects) => ipcRenderer.send("regions", rects),
  onPetVisible: (fn) => subscribe("pet-visible", fn),
  onClosePopup: (fn) => subscribe("close-popup", fn),
  onQuickAdd: (fn) => subscribe("quick-add", fn),
  onReply: (fn) => subscribe("reply", fn),
  onSnapshot: (fn) => subscribe("snapshot-changed", fn),
};
contextBridge.exposeInMainWorld("butler", api);
