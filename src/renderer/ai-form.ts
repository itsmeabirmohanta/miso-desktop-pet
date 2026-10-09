import { providers, aiConfig, normalizeBaseUrl } from "../shared/ai";
import type { AIProvider, Snapshot, Settings } from "../shared/types";
export function aiFields(prefix: string): string {
  return `<label class="field"><span>AI provider</span><select id="${prefix}-provider">${Object.entries(
    providers,
  )
    .map(([id, p]) => `<option value="${id}">${p.label}</option>`)
    .join("")}</select></label>
  <label class="field"><span>Model ID</span><input id="${prefix}-model" placeholder="Enter the exact model ID from your provider" required maxlength="100"><small>Use any text-chat model available to your account or local server.</small></label>
  <label class="field"><span>API base URL</span><input id="${prefix}-url" placeholder="https://your-provider.example/v1" required maxlength="1000"><small>For compatible servers, include /v1, without /chat/completions.</small></label>
  <label class="check-field"><input id="${prefix}-needs-key" type="checkbox">This server requires an API key</label>
  <label class="field" id="${prefix}-key-field"><span>API key</span><input id="${prefix}-key" type="password" autocomplete="off" maxlength="1000" placeholder="Paste your provider API key"><small>Encrypted on this device. Leave blank to keep a key already saved for this endpoint.</small></label>
  <p class="ai-hint" id="${prefix}-hint"></p>`;
}
export function bindAI(prefix: string, onChange: () => void) {
  const get = <T extends HTMLElement>(suffix: string) =>
    document.getElementById(`${prefix}-${suffix}`) as T;
  let snapshot: Snapshot | undefined;
  function savedKey() {
    if (!snapshot) return false;
    try {
      const config = aiConfig(snapshot.settings);
      return (
        config.provider === get<HTMLSelectElement>("provider").value &&
        normalizeBaseUrl(config.baseUrl) ===
          normalizeBaseUrl(get<HTMLInputElement>("url").value) &&
        snapshot.hasApiKey
      );
    } catch {
      return false;
    }
  }
  function refresh() {
    const provider = get<HTMLSelectElement>("provider").value as AIProvider;
    const optional = provider === "compatible" || provider === "ollama";
    const required = get<HTMLInputElement>("needs-key");
    required.disabled = !optional;
    if (!optional) required.checked = true;
    required.parentElement!.hidden = !optional;
    const key = get<HTMLInputElement>("key");
    key.required = required.checked && !savedKey();
    key.placeholder = savedKey()
      ? "Saved securely · leave blank to keep"
      : "Paste your provider API key";
    get("key-field").hidden = !required.checked;
    get("hint").textContent =
      provider === "ollama"
        ? "Start Ollama and install your model first. Local models usually do not need an API key."
        : provider === "compatible"
          ? "Works with services that implement OpenAI-compatible Chat Completions. Enter the service’s base URL, model and key."
          : "Use an API key from this provider’s developer console. A chat-app subscription is not an API key.";
  }
  get("provider").addEventListener("change", () => {
    const profile =
      providers[get<HTMLSelectElement>("provider").value as AIProvider];
    get<HTMLInputElement>("model").value = profile.model;
    get<HTMLInputElement>("url").value = profile.baseUrl;
    get<HTMLInputElement>("needs-key").checked = profile.keyRequired;
    get<HTMLInputElement>("key").value = "";
    refresh();
    onChange();
  });
  get("url").addEventListener("input", () => {
    refresh();
    onChange();
  });
  get("needs-key").addEventListener("change", () => {
    refresh();
    onChange();
  });
  for (const suffix of ["model", "key"])
    get(suffix).addEventListener("input", onChange);
  return {
    update(value: Snapshot, overwrite = true) {
      snapshot = value;
      if (overwrite) {
        const config = aiConfig(value.settings);
        get<HTMLSelectElement>("provider").value = config.provider;
        get<HTMLInputElement>("model").value = config.model;
        get<HTMLInputElement>("url").value = config.baseUrl;
        get<HTMLInputElement>("needs-key").checked = config.keyRequired;
      }
      refresh();
    },
    read(): { settings: Partial<Settings>; secrets: { apiKey?: string } } {
      const url = get<HTMLInputElement>("url").value.trim();
      normalizeBaseUrl(url);
      const model = get<HTMLInputElement>("model").value.trim();
      if (!model)
        throw new Error("Enter the exact model ID you want MISO to use.");
      const key = get<HTMLInputElement>("key").value.trim();
      if (get<HTMLInputElement>("needs-key").checked && !key && !savedKey())
        throw new Error("Paste the API key for this provider first.");
      return {
        settings: {
          aiProvider: get<HTMLSelectElement>("provider").value as AIProvider,
          model,
          aiBaseUrl: url,
          aiKeyRequired: get<HTMLInputElement>("needs-key").checked,
        },
        secrets: key ? { apiKey: key } : {},
      };
    },
    clearKey() {
      get<HTMLInputElement>("key").value = "";
    },
  };
}
