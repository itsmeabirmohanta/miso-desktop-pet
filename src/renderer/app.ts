import type { Reply, Snapshot, PetState, PetLayout } from "../shared/types";
import assets from "../assets/manifest.json";
import { APP_NAME } from "../shared/brand";
import { setupDashboard } from "./dashboard";
import { quickAdd } from "./quick-add";
import { setupWizard } from "./setup";
const root = document.querySelector<HTMLElement>("#app")!;
const api = window.butler;
const settingsView =
  new URLSearchParams(location.search).get("view") === "settings";
document.body.className = settingsView ? "settings-view" : "pet-view";
const el = <T extends HTMLElement = HTMLElement>(id: string) =>
  document.getElementById(id) as T;
let current: Snapshot;
let busy = false;
function text(tag: string, value: string, className?: string) {
  const node = document.createElement(tag);
  node.textContent = value;
  if (className) node.className = className;
  return node;
}
function button(label: string, fn: () => void, className?: string) {
  const node = text("button", label, className) as HTMLButtonElement;
  node.type = "button";
  node.addEventListener("click", fn);
  return node;
}
if (new URLSearchParams(location.search).get("view") === "setup")
  setupWizard(root);
else if (settingsView) setupDashboard(root);
else setupPet();
function setupPet() {
  root.innerHTML = `<section class="pet-stage"><div id="bubble" class="bubble hidden"><div class="bubble-top"><span id="bubble-title">A LITTLE HELP FROM MISO</span><button id="close" class="icon-button" aria-label="Close bubble">×</button></div><div id="message" class="bubble-message">Hi, I’m Miso. What should I remember?</div><div id="quick-add" hidden></div><div id="choices" class="choices"></div><div id="reminder-buttons" class="reminder-buttons"></div><form id="command-form" class="command-form"><input id="command" aria-label="Tell MISO what to remember" placeholder="Remind me to…" maxlength="2000" autocomplete="off"><button id="submit" class="primary" aria-label="Send command">↑</button></form><div class="pet-tools"><button id="open-settings">Settings</button><span id="connection" class="muted"></span></div></div><button id="pet" class="pet-button" data-state="idle" aria-label="Open MISO; drag to move"><img id="pet-image" src="../assets/cat.svg" alt="Your animated cat companion" draggable="false"></button><span id="pet-label" class="pet-label">MISO · YOUR LITTLE BUTLER</span></section>`;
  let quickActive = false;
  let activeState: PetState = "idle";
  function updateMascot() {
    const picture = el<HTMLImageElement>("pet-image");
    const path = `../assets/${assets.mascot[activeState]}`;
    if (picture.getAttribute("src") !== path) picture.src = path;
  }
  el<HTMLImageElement>("pet-image").onerror = () => {
    const picture = el<HTMLImageElement>("pet-image");
    const fallback =
      activeState === "wink" ? "../assets/cat-wink.svg" : "../assets/cat.svg";
    if (picture.getAttribute("src") !== fallback) picture.src = fallback;
  };
  updateMascot();
  function restoreHome() {
    if (quickActive) {
      quickActive = false;
      void api.endQuick();
    }
  }
  const quick = quickAdd(el("quick-add"), {
    snapshot: () => current,
    close: hide,
    saved: (message) => {
      restoreHome();
      display({ text: "aye aye boss\n" + message, state: "wink" });
    },
  });
  async function openQuick() {
    if (
      !current ||
      current.panelOpen ||
      reminderKey ||
      busy ||
      quick.saving ||
      quickActive
    )
      return;
    quickActive = true;
    try {
      if (!(await api.beginQuick())) {
        quickActive = false;
        return;
      }
    } catch (error) {
      quickActive = false;
      display({ text: (error as Error).message });
      return;
    }
    show();
    el("message").textContent = "";
    el("choices").replaceChildren();
    el("command-form").hidden = true;
    quick.open();
  }
  let reminderKey: string | undefined;
  let restore: ReturnType<typeof setTimeout> | undefined;
  const queue: Reply[] = [];
  function regions() {
    const nodes = [
      el("pet"),
      el("pet-label"),
      ...(!el("bubble").classList.contains("hidden") ? [el("bubble")] : []),
    ];
    api.regions(
      nodes.map((node) => {
        const r = node.getBoundingClientRect();
        return { x: r.x, y: r.y, width: r.width, height: r.height };
      }),
    );
  }
  new ResizeObserver(regions).observe(el("bubble"));
  function layout(value: PetLayout) {
    const stage = root.querySelector<HTMLElement>(".pet-stage")!;
    stage.style.setProperty("--cat-x", value.x + "px");
    stage.style.setProperty("--cat-y", value.y + "px");
    stage.classList.toggle("popup-below", !value.above);
    stage.classList.toggle("workflow-centered", !!value.centered);
    regions();
  }
  api.onPetLayout(layout);
  regions();
  function state(value: PetState) {
    activeState = value;
    el("pet").dataset.state = value;
    updateMascot();
    if (restore) clearTimeout(restore);
    if (value === "happy" || value === "wink")
      restore = setTimeout(() => state("idle"), 2500);
  }
  function show() {
    el("bubble").classList.remove("hidden");
    api.interactive(true);
    regions();
  }
  function hide() {
    if (reminderKey || quick.saving) return;
    restoreHome();
    quick.hide();
    el("bubble").classList.add("hidden");
    api.interactive(false);
    state("idle");
    regions();
  }
  function display(value: Reply) {
    if (current?.panelOpen) {
      queue.push(value);
      return;
    }
    if (value.state === "happy")
      value = { ...value, text: "aye aye boss\n" + value.text, state: "wink" };
    if (reminderKey) {
      queue.push(value);
      return;
    }
    quick.hide();
    show();
    el("command-form").hidden = !current?.settings.aiEnabled;
    el("message").textContent = value.text;
    el("choices").replaceChildren();
    state(value.state ?? "idle");
    for (const choice of value.choices ?? [])
      el("choices").append(
        button(choice.label, () => void run(() => api.choose(choice.id))),
      );
    if (value.reminder) {
      reminderKey = value.reminder.key;
      el("reminder-buttons").replaceChildren();
      for (const minutes of [5, 15, 60])
        el("reminder-buttons").append(
          button(`Snooze ${minutes}m`, () => void finishReminder(minutes)),
        );
      el("reminder-buttons").append(
        button("Done", () => void finishReminder(), "primary"),
      );
    }
  }
  async function finishReminder(minutes?: number) {
    try {
      if (reminderKey) {
        if (minutes) await api.snooze(reminderKey, minutes);
        else await api.done(reminderKey);
      }
      reminderKey = undefined;
      el("reminder-buttons").replaceChildren();
      state("idle");
      const next = queue.shift();
      if (next) display(next);
      else
        el("message").textContent = minutes
          ? `I’ll remind you again in ${minutes} minutes.`
          : "All done. You’ve got this.";
    } catch (error) {
      el("message").textContent = (error as Error).message;
    }
  }
  async function run(fn: () => Promise<Reply>) {
    if (busy) return;
    busy = true;
    state("thinking");
    el<HTMLButtonElement>("submit").disabled = true;
    try {
      display(await fn());
    } catch (error) {
      display({ text: (error as Error).message });
    } finally {
      busy = false;
      el<HTMLButtonElement>("submit").disabled = false;
    }
  }
  el("command-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const input = el<HTMLInputElement>("command");
    const value = input.value.trim();
    if (!value || busy) return;
    input.value = "";
    void run(() => api.command(value));
  });
  api.onPetVisible((visible) =>
    document.body.classList.toggle("pet-hidden", !visible),
  );
  api.onClosePopup(() => {
    quickActive = false;
    quick.hide();
    el("bubble").classList.add("hidden");
    api.interactive(false);
    regions();
  });
  api.onQuickAdd(openQuick);
  el("close").addEventListener("click", hide);
  el("open-settings").addEventListener("click", () => void api.settings());
  const pet = el("pet");
  let drag:
    { x: number; y: number; windowX: number; windowY: number } | undefined;
  let moved = false;
  pet.addEventListener("pointerdown", (event) => {
    const e = event as PointerEvent;
    if (e.button !== 0 || quickActive) return;
    drag = {
      x: e.screenX,
      y: e.screenY,
      windowX: window.screenX + pet.getBoundingClientRect().x,
      windowY: window.screenY + pet.getBoundingClientRect().y,
    };
    moved = false;
    pet.setPointerCapture(e.pointerId);
    api.dragging(true);
    api.interactive(true);
  });
  pet.addEventListener("pointermove", (event) => {
    if (!drag) return;
    const e = event as PointerEvent;
    if (!(e.buttons & 1)) {
      endDrag();
      return;
    }
    const dx = e.screenX - drag.x,
      dy = e.screenY - drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 4) {
      moved = true;
      state("walk");
      api.move(drag.windowX + dx, drag.windowY + dy);
    }
  });
  function endDrag() {
    drag = undefined;
    api.dragging(false);
    state("idle");
  }
  pet.addEventListener("pointerup", () => {
    const clicked = !moved;
    endDrag();
    if (clicked) openQuick();
  });
  pet.addEventListener("pointercancel", endDrag);
  pet.addEventListener("lostpointercapture", endDrag);
  window.addEventListener("blur", endDrag);
  document.addEventListener("mousemove", (event) => {
    if (drag) return;
    const target = event.target as Element;
    api.interactive(
      !!target.closest(".pet-button,.pet-label") ||
        (!el("bubble").classList.contains("hidden") &&
          !!target.closest(".bubble")),
    );
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") hide();
  });
  function update(value: Snapshot) {
    const wasOpen = current?.panelOpen;
    current = value;
    if (value.panelOpen) {
      quickActive = false;
      quick.hide();
      el("bubble").classList.add("hidden");
      regions();
    } else if (wasOpen) {
      if (reminderKey) show();
      else {
        const next = queue.shift();
        if (next) display(next);
      }
    }
    if (value.petLayout) layout(value.petLayout);
    if (el("quick-add").hidden)
      el("command-form").hidden = !value.settings.aiEnabled;
    updateMascot();
    el("pet").classList.toggle("midnight", value.settings.skin === "midnight");
    el("pet-label").textContent = APP_NAME;
    el("connection").textContent = value.settings.paused
      ? "Paused"
      : value.connected
        ? "Connected"
        : "Setup needed";
    if (value.settings.paused) state("sleep");
  }
  api.onSnapshot(update);
  api.onReply(display);
  void api
    .snapshot()
    .then(update)
    .catch((error) => display({ text: (error as Error).message }));
}
