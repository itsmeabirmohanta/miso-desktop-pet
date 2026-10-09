import { calendarView } from "./calendar-view";
import type { Category, ManualEventInput, Snapshot } from "../shared/types";
export function quickAdd(
  root: HTMLElement,
  options: {
    snapshot: () => Snapshot;
    close: () => void;
    saved: (message: string) => void;
  },
) {
  let step = 0,
    saving = false;
  let data: ManualEventInput;
  let reminder = "10";
  const today = () =>
    new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 10);
  function reset() {
    step = 0;
    reminder = "10";
    data = {
      accountId: options.snapshot().settings.defaultAccountId,
      category: "reminder",
      title: "",
      start: today() + "T09:00",
      allDay: false,
      yearly: false,
      reminders: [10],
    };
  }
  const prompts = [
    "how can i help u boss",
    "enter the title boss",
    "which date boss?",
    "what time boss?",
    "repeat every year boss?",
    "when should I remind you boss?",
    "which account boss?",
    "ready to save boss?",
  ];
  function render() {
    root.hidden = false;
    root.replaceChildren();
    const heading = document.createElement("p");
    heading.className = "quick-prompt";
    heading.textContent = prompts[step];
    if (step === 0) {
      const header = document.createElement("div");
      header.className = "quick-heading-row";
      const settings = document.createElement("button");
      settings.id = "quick-settings";
      settings.type = "button";
      settings.className = "quick-settings";
      settings.textContent = "Settings";
      settings.title = "Open settings and connections";
      settings.onclick = () => void window.butler.settings();
      header.append(heading, settings);
      root.append(header);
    } else root.append(heading);
    if (step) {
      const progress = document.createElement("p");
      progress.className = "step-caption";
      progress.textContent =
        step === 7
          ? "Final review"
          : `Step ${step} ? ${data.category === "date" ? "Important date" : data.category === "task" ? "Task" : "Reminder"}`;
      root.append(progress);
    }
    const form = document.createElement("form");
    form.id = "quick-form";
    const field = document.createElement(
      step === 0 || step === 5 || step === 6 ? "select" : "input",
    ) as HTMLInputElement | HTMLSelectElement;
    field.id = "quick-field";
    field.required = true;
    field.setAttribute("aria-label", prompts[step]);
    const choose = (values: [string, string][], selected: string) => {
      for (const [value, label] of values) {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = label;
        field.append(option);
      }
      field.value = selected;
    };
    if (step === 0)
      choose(
        [
          ["reminder", "Add a reminder"],
          ["task", "Add a task"],
          ["date", "Add an important date"],
          ["calendar", "View calendar"],
        ],
        data.category,
      );
    if (step === 1) {
      (field as HTMLInputElement).type = "text";
      field.value = data.title;
      (field as HTMLInputElement).maxLength = 300;
    }
    if (step === 2) {
      (field as HTMLInputElement).type = "date";
      field.value = data.start.slice(0, 10);
      (field as HTMLInputElement).min = today();
    }
    if (step === 3) {
      (field as HTMLInputElement).type = "time";
      field.value = data.start.slice(11) || "09:00";
    }
    if (step === 4) {
      (field as HTMLInputElement).type = "checkbox";
      field.required = false;
      (field as HTMLInputElement).checked = data.yearly;
      const label = document.createElement("label");
      label.className = "check-field";
      label.append(field, document.createTextNode("Repeat every year"));
      form.append(label);
    }
    if (step === 5)
      choose(
        data.allDay
          ? [
              ["900", "Previous day at 9 AM"],
              ["2340", "Two days before at 9 AM"],
              ["9540", "One week before at 9 AM"],
              ["0", "At midnight"],
              ["-1", "No reminder"],
            ]
          : [
              ["0", "At event time"],
              ["10", "10 minutes before"],
              ["60", "One hour before"],
              ["1440", "One day before"],
              ["-1", "No reminder"],
            ],
        reminder,
      );
    if (step === 6)
      choose(
        options.snapshot().accounts.map((a) => [a.id, a.email]),
        data.accountId,
      );
    if (step === 7) {
      const summary = document.createElement("p");
      summary.className = "quick-review";
      summary.textContent = `${data.title}\n${data.start.replace("T", " at ")}${data.allDay ? " · All day" : ""}${data.yearly ? " · Every year" : ""}\n${options.snapshot().accounts.find((a) => a.id === data.accountId)?.email ?? "Account unavailable"}\n${Number(reminder) < 0 ? "No reminder" : Number(reminder) === 0 ? (data.allDay ? "Reminder: at midnight" : "Reminder: at event time") : data.allDay && ["900", "2340", "9540"].includes(reminder) ? `Reminder: ${reminder === "900" ? "previous day" : reminder === "2340" ? "two days before" : "one week before"} at 9 AM` : `Reminder: ${reminder} minutes before`}\nSaves to Google Calendar.`;
      form.append(summary);
    } else if (step !== 4) form.append(field);
    const error = document.createElement("p");
    error.id = "quick-error";
    error.className = "feedback";
    error.setAttribute("role", "status");
    form.append(error);
    const buttons = document.createElement("div");
    buttons.className = "quick-actions";
    const back = document.createElement("button");
    back.type = "button";
    back.textContent = step ? "Back" : "Cancel";
    back.onclick = () => {
      if (saving) return;
      if (!step) {
        root.hidden = true;
        options.close();
        return;
      }
      step = previous(step);
      render();
    };
    const next = document.createElement("button");
    next.className = "primary";
    next.textContent = step === 7 ? "Save" : "Next";
    buttons.append(back, next);
    if (step) {
      const cancel = document.createElement("button");
      cancel.type = "button";
      cancel.textContent = "Cancel";
      cancel.onclick = () => {
        if (!saving) {
          root.hidden = true;
          options.close();
        }
      };
      buttons.append(cancel);
    }
    form.append(buttons);
    root.append(form);
    form.onsubmit = (e) => {
      e.preventDefault();
      if (saving) return;
      if (step === 0 && field.value === "calendar") {
        calendarView(root, {
          ...options,
          back: render,
          busy: (value) => (saving = value),
        });
        return;
      }
      if (step === 0) {
        data.category = field.value as Category;
        data.allDay = data.category === "date";
        data.yearly = data.allDay;
        reminder = data.allDay ? "900" : "10";
      }
      if (step === 1) {
        data.title = field.value.trim();
        if (!data.title) {
          error.textContent = "Enter a title first, boss.";
          return;
        }
      }
      if (step === 2)
        data.start =
          field.value +
          (data.allDay ? "" : "T" + (data.start.slice(11) || "09:00"));
      if (step === 3) data.start = data.start.slice(0, 10) + "T" + field.value;
      if (step === 4) data.yearly = (field as HTMLInputElement).checked;
      if (step === 5) {
        reminder = field.value;
        data.reminders = Number(reminder) < 0 ? [] : [Number(reminder)];
      }
      if (step === 6) data.accountId = field.value;
      if (step === 7) {
        saving = true;
        form
          .querySelectorAll<HTMLButtonElement>("button")
          .forEach((b) => (b.disabled = true));
        error.textContent = "Saving to Google, boss…";
        void window.butler
          .createManual(data)
          .then((result) => {
            root.hidden = true;
            options.saved(result.message);
          })
          .catch((e) => {
            error.textContent = e.message;
          })
          .finally(() => {
            saving = false;
            form
              .querySelectorAll<HTMLButtonElement>("button")
              .forEach((b) => (b.disabled = false));
          });
        return;
      }
      step = following(step);
      render();
    };
    if (step !== 7) field.focus();
    else next.focus();
  }
  function following(s: number) {
    if (s === 2 && data.allDay) return 4;
    if (s === 3) return 5;
    if (s === 5 && options.snapshot().accounts.length < 2) return 7;
    return s + 1;
  }
  function previous(s: number) {
    if (s === 7 && options.snapshot().accounts.length < 2) return 5;
    if (s === 5 && !data.allDay) return 3;
    if (s === 4) return 2;
    return s - 1;
  }
  return {
    open() {
      if (saving) return;
      reset();
      render();
    },
    hide() {
      root.hidden = true;
    },
    get saving() {
      return saving;
    },
  };
}
