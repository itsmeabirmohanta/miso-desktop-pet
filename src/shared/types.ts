import type { calendar_v3 } from "@googleapis/calendar";
export type Category = "task" | "date" | "reminder";
export type AIProvider =
  "anthropic" | "openai" | "gemini" | "compatible" | "ollama";
export type PetState =
  "idle" | "walk" | "sleep" | "alert" | "happy" | "thinking" | "wink";
export type CalendarEvent = calendar_v3.Schema$Event & {
  calendarId: string;
  calendarZone?: string;
  defaultOffsets?: number[];
};
export interface CalendarInfo {
  id: string;
  title: string;
  role: string;
  timeZone: string;
  defaultOffsets: number[];
  accountId?: string;
  accountEmail?: string;
  primary?: boolean;
}
export interface GoogleAccount {
  id: string;
  email: string;
  petCalendars: Partial<Record<Category, string>>;
}
export interface AccountStatus extends GoogleAccount {
  status: string;
  connected: boolean;
}
export interface ManualEventInput {
  accountId: string;
  category: Category;
  title: string;
  start: string;
  allDay: boolean;
  yearly: boolean;
  reminders: number[];
}
export interface OperationResult {
  success: boolean;
  message: string;
  snapshot: Snapshot;
}
export interface Settings {
  googleClientId: string;
  model: string;
  selectedCalendars: string[];
  petCalendars: Partial<Record<Category, string>>;
  aiProvider: AIProvider;
  aiBaseUrl: string;
  aiKeyRequired: boolean;
  aiValidationFingerprint: string;
  aiEnabled: boolean;
  accounts: GoogleAccount[];
  defaultAccountId: string;
  hotkey: string;
  meetingLead: number;
  pollMinutes: number;
  sound: boolean;
  startAtLogin: boolean;
  skin: "ginger" | "midnight";
  quietStart: string;
  quietEnd: string;
  paused: boolean;
  position?: { x: number; y: number };
}
export interface Reminder {
  key: string;
  title: string;
  event: CalendarEvent;
  fireAt: number;
  missed: boolean;
}
export interface Choice {
  id: string;
  label: string;
}
export interface Reply {
  text: string;
  state?: PetState;
  choices?: Choice[];
  reminder?: Reminder;
}
export interface PetLayout {
  x: number;
  y: number;
  above: boolean;
  centered?: boolean;
  popupCenter?: number;
  popupMaxHeight?: number;
  workflowHeight?: number;
}
export interface Snapshot {
  panelOpen?: boolean;
  petLayout?: PetLayout;
  settings: Settings;
  connected: boolean;
  hasApiKey: boolean;
  hasClientSecret: boolean;
  aiVerified: boolean;
  setupReady: boolean;
  oauthConfigured: boolean;
  defaultOAuthAvailable?: boolean;
  usingDefaultOAuth?: boolean;
  accounts: AccountStatus[];
  calendars: CalendarInfo[];
  upcoming: CalendarEvent[];
  status: string;
}
export interface ButlerAPI {
  snapshot(): Promise<Snapshot>;
  command(text: string): Promise<Reply>;
  choose(id: string): Promise<Reply>;
  save(
    settings: Partial<Settings>,
    secrets?: { apiKey?: string; clientSecret?: string },
  ): Promise<Snapshot>;
  connect(): Promise<Snapshot>;
  disconnect(): Promise<Snapshot>;
  sync(): Promise<Snapshot>;
  removeAccount(id: string): Promise<OperationResult>;
  resetSetup(): Promise<OperationResult>;
  restoreDefaultOAuth(): Promise<Snapshot>;
  createManual(input: ManualEventInput): Promise<OperationResult>;
  getCalendarEvent(calendarId: string, eventId: string): Promise<CalendarEvent>;
  openCalendarEvent(calendarId: string, eventId: string): Promise<void>;
  previewEdit(
    calendarId: string,
    eventId: string,
    input: { title: string; start: string; end: string },
  ): Promise<{ ticket: string; summary: string }>;
  confirmEdit(ticket: string): Promise<OperationResult>;
  cancelEdit(ticket: string): Promise<void>;
  previewDelete(
    calendarId: string,
    eventId: string,
    scope: "instance" | "series",
  ): Promise<{
    ticket: string;
    title: string;
    calendar: string;
    recurring: boolean;
  }>;
  confirmDelete(ticket: string): Promise<OperationResult>;
  cancelDelete(ticket: string): Promise<void>;
  testAI(): Promise<Snapshot>;
  finishSetup(): Promise<Snapshot>;
  help(
    topic: "google" | "google-calendar" | "ai",
    provider?: AIProvider,
  ): Promise<void>;
  snooze(key: string, minutes: number): Promise<void>;
  done(key: string): Promise<void>;
  settings(): Promise<void>;
  interactive(value: boolean): void;
  move(x: number, y: number): void;
  beginQuick(): Promise<boolean>;
  endQuick(): Promise<void>;
  dragging(value: boolean): void;
  onPetLayout(fn: (layout: PetLayout) => void): () => void;
  regions(
    rects: { x: number; y: number; width: number; height: number }[],
  ): void;
  onPetVisible(fn: (visible: boolean) => void): () => void;
  onClosePopup(fn: () => void): () => void;
  onQuickAdd(fn: () => void): () => void;
  onReply(fn: (reply: Reply) => void): () => void;
  onSnapshot(fn: (data: Snapshot) => void): () => void;
}
declare global {
  interface Window {
    butler: ButlerAPI;
  }
}
