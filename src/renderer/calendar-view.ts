import { DateTime } from "luxon";
import type { CalendarEvent, Snapshot } from "../shared/types";
export function calendarView(
  root: HTMLElement,
  options: {
    snapshot: () => Snapshot;
    back: () => void;
    close: () => void;
    saved: (message: string) => void;
    busy: (value: boolean) => void;
  },
) {
  const api = window.butler;
  let working = false;
  const node = (tag: string, text: string, className?: string) => {
    const n = document.createElement(tag);
    n.textContent = text;
    if (className) n.className = className;
    return n;
  };
  const button = (text: string, action: () => void, primary = false) => {
    const b = node(
      "button",
      text,
      primary ? "primary" : "",
    ) as HTMLButtonElement;
    b.type = "button";
    b.onclick = action;
    return b;
  };
  function heading(title: string, subtitle: string) {
    root.replaceChildren(
      node("p", title, "quick-prompt"),
      node("p", subtitle, "dialog-subtitle"),
    );
  }
  function error(message: string) {
    let status = root.querySelector<HTMLElement>("#calendar-feedback");
    if (!status) {
      status = node("p", "", "feedback");
      status.id = "calendar-feedback";
      status.setAttribute("role", "status");
      root.append(status);
    }
    status.textContent = message;
  }
  async function run(fn: () => Promise<void>) {
    if (working) return;
    working = true;
    options.busy(true);
    root
      .querySelectorAll<HTMLButtonElement>("button")
      .forEach((b) => (b.disabled = true));
    try {
      await fn();
    } catch (e) {
      error((e as Error).message);
    } finally {
      working = false;
      options.busy(false);
      root
        .querySelectorAll<HTMLButtonElement>("button")
        .forEach((b) => (b.disabled = false));
    }
  }
  const when = (e: CalendarEvent) =>
    e.start?.date
      ? DateTime.fromISO(e.start.date).toFormat("ccc, dd LLL") + " · All day"
      : DateTime.fromISO(e.start?.dateTime ?? "")
          .toLocal()
          .toFormat("ccc, dd LLL · h:mm a");
  function agenda() {
    heading(
      "Your calendar, boss",
      "Today and the next 7 days · selected calendars",
    );
    const search = document.createElement("input");
    search.type = "search";
    search.id = "agenda-search";
    search.placeholder = "Search title or account";
    search.setAttribute("aria-label", "Search calendar events");
    root.append(search);
    const list = document.createElement("div");
    list.className = "popup-agenda";
    list.id = "popup-agenda";
    const s = options.snapshot();
    for (const e of s.upcoming) {
      if (!e.id) continue;
      const cal = s.calendars.find((c) => c.id === e.calendarId);
      const item = button(
        "",
        () =>
          void run(async () =>
            details(await api.getCalendarEvent(e.calendarId, e.id!)),
          ),
      );
      item.className = "popup-event";
      item.dataset.search =
        `${e.summary ?? ""} ${cal?.accountEmail ?? ""} ${cal?.title ?? ""}`.toLowerCase();
      const category = e.extendedProperties?.private?.petCategory;
      item.dataset.category =
        category === "task" || category === "date" || category === "reminder"
          ? category
          : e.attendees?.length
            ? "meeting"
            : "event";
      item.append(
        node(
          "span",
          category === "task"
            ? "TASK"
            : category === "date"
              ? "IMPORTANT DATE"
              : category === "reminder"
                ? "REMINDER"
                : e.attendees?.length
                  ? "MEETING"
                  : "EVENT",
          "event-kind",
        ),
        node("strong", e.summary ?? "Untitled event"),
        node("small", when(e)),
        node("small", cal?.accountEmail ?? cal?.title ?? ""),
      );
      list.append(item);
    }
    if (!list.children.length)
      list.append(
        node(
          "p",
          "Nothing scheduled here yet. Add an event or sync your calendars.",
          "empty",
        ),
      );
    const noMatch = node("p", "No matching events.", "empty");
    noMatch.hidden = true;
    list.append(noMatch);
    search.oninput = () => {
      const query = search.value.trim().toLowerCase();
      let matches = 0;
      list
        .querySelectorAll<HTMLButtonElement>(".popup-event")
        .forEach((item) => {
          item.hidden = !item.dataset.search?.includes(query);
          if (!item.hidden) matches++;
        });
      noMatch.hidden = matches > 0 || !s.upcoming.length;
    };
    root.append(list);
    if (s.accounts.some((a) => !a.connected))
      root.append(
        node(
          "p",
          "Some accounts are offline. Showing cached events; use Settings to reconnect.",
          "dialog-subtitle",
        ),
      );
    const actions = node("div", "", "quick-actions");
    actions.append(
      button("Back", options.back),
      button(
        "Refresh",
        () =>
          void run(async () => {
            await api.sync();
            agenda();
          }),
      ),
      button("Close", options.close),
    );
    root.append(actions);
  }
  function details(e: CalendarEvent) {
    const cal = options.snapshot().calendars.find((c) => c.id === e.calendarId);
    heading(e.summary ?? "Untitled event", when(e));
    const metadata = node("div", "", "event-detail");
    metadata.append(
      node("p", cal?.title ?? "Calendar"),
      node("small", cal?.accountEmail ?? ""),
    );
    if (e.location) metadata.append(node("p", e.location));
    if (e.description) metadata.append(node("p", e.description.slice(0, 1500)));
    if (e.recurringEventId)
      metadata.append(
        node("small", "Repeating event · edits apply to this occurrence."),
      );
    root.append(metadata);
    const actions = node("div", "", "quick-actions");
    actions.append(button("Back", agenda));
    if (
      cal &&
      ["owner", "writer"].includes(cal.role) &&
      (!e.recurrence?.length || e.recurringEventId)
    )
      actions.append(button("Edit", () => edit(e), true));
    actions.append(
      button(
        "View in calendar",
        () => void run(() => api.openCalendarEvent(e.calendarId, e.id!)),
      ),
    );
    root.append(actions);
  }
  function edit(
    e: CalendarEvent,
    value?: { title: string; start: string; end: string },
  ) {
    heading(
      "Edit event, boss",
      e.recurringEventId
        ? "Only this occurrence will change."
        : "Review your changes before saving.",
    );
    const allDay = !!e.start?.date;
    const format = (v: string | undefined) =>
      allDay
        ? (v ?? "")
        : DateTime.fromISO(v ?? "")
            .toLocal()
            .toFormat("yyyy-MM-dd'T'HH:mm");
    const draft = value ?? {
      title: e.summary ?? "",
      start: format(e.start?.date ?? e.start?.dateTime ?? undefined),
      end: format(e.end?.date ?? e.end?.dateTime ?? undefined),
    };
    const form = document.createElement("form");
    form.id = "popup-edit-form";
    const inputs: HTMLInputElement[] = [];
    for (const [id, label, type, current] of [
      ["title", "Title", "text", draft.title],
      ["start", "Starts", allDay ? "date" : "datetime-local", draft.start],
      [
        "end",
        allDay ? "Ends (exclusive date)" : "Ends",
        allDay ? "date" : "datetime-local",
        draft.end,
      ],
    ]) {
      const wrapper = node("label", "", "field");
      wrapper.append(node("span", label));
      const input = document.createElement("input");
      input.id = "edit-" + id;
      input.type = type;
      input.value = current;
      input.required = true;
      if (id === "title") input.maxLength = 300;
      wrapper.append(input);
      form.append(wrapper);
      inputs.push(input);
    }
    if (allDay)
      form.append(
        node(
          "small",
          "An all-day event ending on Tuesday includes Monday, not Tuesday.",
          "dialog-subtitle",
        ),
      );
    const actions = node("div", "", "quick-actions");
    const review = button("Review changes", () => {}, true);
    review.type = "submit";
    actions.append(
      button("Back", () => details(e)),
      review,
    );
    form.append(actions);
    form.onsubmit = (event) => {
      event.preventDefault();
      const changed = {
        title: inputs[0].value,
        start: inputs[1].value,
        end: inputs[2].value,
      };
      void run(async () => {
        const preview = await api.previewEdit(e.calendarId, e.id!, changed);
        heading(
          "Confirm your changes",
          "Google Calendar will update on your other devices too.",
        );
        root.append(node("p", preview.summary, "quick-review"));
        const confirmActions = node("div", "", "quick-actions");
        confirmActions.append(
          button(
            "Back",
            () =>
              void run(async () => {
                await api.cancelEdit(preview.ticket);
                edit(e, changed);
              }),
          ),
          button(
            "Save changes",
            () =>
              void run(async () => {
                const result = await api.confirmEdit(preview.ticket);
                options.saved(result.message);
              }),
            true,
          ),
        );
        root.append(confirmActions);
      });
    };
    root.append(form);
    inputs[0].focus();
  }
  agenda();
}
