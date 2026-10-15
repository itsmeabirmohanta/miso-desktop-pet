import {
  providers,
  aiConfig,
  normalizeBaseUrl,
  cleanAPIKey,
  detectKeyProvider,
  providerBaseUrl,
} from "../shared/ai";
import type {
  AIProvider,
  AIModel,
  AISetupInput,
  Snapshot,
} from "../shared/types";
export function aiFields(prefix: string): string {
  return `<label class="field"><span>AI provider</span><select id="${prefix}-provider">${Object.entries(
    providers,
  )
    .map(([id, p]) => `<option value="${id}">${p.label}</option>`)
    .join("")}</select></label>
  <label class="field" id="${prefix}-key-field"><span>API key</span><input id="${prefix}-key" type="password" autocomplete="off" maxlength="1000" placeholder="Paste your provider API key"><small>Paste the key; MISO can choose and test a model for you. Stored encrypted on this device.</small></label>
  <label class="field"><span>Model</span><select id="${prefix}-selection"><option value="auto">Automatic (recommended)</option><option value="custom">Enter a custom model ID</option></select><small>Automatic checks available text models and verifies a suitable one.</small></label>
  <div class="button-row"><button id="${prefix}-load-models" type="button">Load available models</button></div><p id="${prefix}-models-status" class="ai-hint" role="status"></p>
  <label class="field" id="${prefix}-custom-field" hidden><span>Custom model ID</span><input id="${prefix}-model" placeholder="Exact model ID from your provider" maxlength="200"><small>For providers that do not expose a model catalog.</small></label>
  <details id="${prefix}-advanced" class="setup-details"><summary>Advanced connection settings</summary><label class="field"><span>API base URL</span><input id="${prefix}-url" required maxlength="1000"><small>Defaults are filled in for official providers. Compatible servers usually use /v1.</small></label><label class="check-field"><input id="${prefix}-needs-key" type="checkbox">This server requires an API key</label></details>
  <p class="ai-hint" id="${prefix}-hint"></p>`;
}
export function bindAI(prefix: string, onChange: () => void) {
  const get = <T extends HTMLElement>(suffix: string) =>
    document.getElementById(`${prefix}-${suffix}`) as T;
  let snapshot: Snapshot | undefined;
  let providerTouched = false;
  let revision = 0;
  let models: AIModel[] = [];
  function savedKey() {
    if (!snapshot) return false;
    try {
      const config = aiConfig(snapshot.settings);
      return (
        config.provider === get<HTMLSelectElement>("provider").value &&
        normalizeBaseUrl(config.baseUrl) ===
          providerBaseUrl(
            config.provider,
            get<HTMLInputElement>("url").value,
          ) &&
        snapshot.hasApiKey
      );
    } catch {
      return false;
    }
  }
  function fillModels(selected = "auto") {
    const select = get<HTMLSelectElement>("selection");
    select.replaceChildren(
      new Option("Automatic (recommended)", "auto"),
      ...models.map(
        (m) =>
          new Option(m.label === m.id ? m.id : `${m.label} · ${m.id}`, m.id),
      ),
    );
    if (
      !["auto", "custom"].includes(selected) &&
      !models.some((m) => m.id === selected)
    )
      select.append(new Option(selected, selected));
    select.append(new Option("Enter a custom model ID", "custom"));
    select.value = selected;
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
    const custom = get<HTMLSelectElement>("selection").value === "custom";
    get("custom-field").hidden = !custom;
    get<HTMLInputElement>("model").required = custom;
    get("hint").textContent =
      provider === "gemini"
        ? "Use a Gemini API key from Google AI Studio. A Google OAuth client secret is different. Quota or key restrictions may require changes in your Google project."
        : provider === "ollama"
          ? "Start Ollama and install a text model. No API key is needed unless your server requires one."
          : provider === "compatible"
            ? "Choose the service’s API base URL and key. Load its text models, use Automatic, or enter a custom model ID."
            : "Use a provider API key. A chat-app subscription does not include API access. MISO verifies the model before saving.";
  }
  function changed(resetCatalog = false) {
    revision++;
    if (resetCatalog) {
      models = [];
      fillModels(
        get<HTMLSelectElement>("selection").value === "custom"
          ? "custom"
          : "auto",
      );
      get("models-status").textContent = "";
    }
    refresh();
    onChange();
  }
  get("provider").addEventListener("change", () => {
    providerTouched = true;
    const provider = get<HTMLSelectElement>("provider").value as AIProvider;
    get<HTMLInputElement>("model").value = "";
    get<HTMLSelectElement>("selection").value = "auto";
    get<HTMLInputElement>("url").value = providers[provider].baseUrl;
    get<HTMLInputElement>("needs-key").checked =
      providers[provider].keyRequired;
    get<HTMLInputElement>("key").value = "";
    get<HTMLDetailsElement>("advanced").open =
      provider === "compatible" || provider === "ollama";
    changed(true);
  });
  get("key").addEventListener("input", () => {
    let detected: AIProvider | undefined;
    try {
      detected = detectKeyProvider(
        cleanAPIKey(get<HTMLInputElement>("key").value),
      );
    } catch {
      /* Report invalid paste on submit. */
    }
    const provider = get<HTMLSelectElement>("provider").value as AIProvider;
    if (
      !providerTouched &&
      detected &&
      provider !== detected &&
      !["compatible", "ollama"].includes(provider)
    ) {
      get<HTMLSelectElement>("provider").value = detected;
      get<HTMLSelectElement>("selection").value = "auto";
      get<HTMLInputElement>("model").value = "";
      get<HTMLInputElement>("url").value = providers[detected].baseUrl;
      get<HTMLInputElement>("needs-key").checked = true;
    }
    changed(true);
  });
  get("url").addEventListener("input", () => changed(true));
  get("needs-key").addEventListener("change", () => changed(true));
  get("selection").addEventListener("change", () => changed());
  get("model").addEventListener("input", () => {
    get<HTMLSelectElement>("selection").value = "custom";
    changed();
  });
  function read(requireModel = true): AISetupInput {
    const provider = get<HTMLSelectElement>("provider").value as AIProvider;
    const baseUrl = providerBaseUrl(
      provider,
      get<HTMLInputElement>("url").value,
    );
    const key = cleanAPIKey(get<HTMLInputElement>("key").value);
    if (get<HTMLInputElement>("needs-key").checked && !key && !savedKey())
      throw new Error("Paste the API key for this provider first.");
    const selection = get<HTMLSelectElement>("selection").value;
    const model =
      selection === "custom"
        ? get<HTMLInputElement>("model").value.trim()
        : selection;
    if (requireModel && !model)
      throw new Error("Enter a custom model ID, or choose Automatic.");
    return {
      provider,
      baseUrl,
      keyRequired: get<HTMLInputElement>("needs-key").checked,
      model: model || "auto",
      ...(key ? { apiKey: key } : {}),
    };
  }
  get("load-models").addEventListener("click", () => {
    const button = get<HTMLButtonElement>("load-models");
    if (button.disabled) return;
    const version = revision;
    button.disabled = true;
    get("models-status").textContent = "Loading models available to this key…";
    void (async () => {
      try {
        const result = await window.butler.discoverAI(read(false));
        if (version !== revision) return;
        models = result.models;
        fillModels(get<HTMLSelectElement>("selection").value);
        get("models-status").textContent =
          `${models.length} text models found. Automatic recommendation: ${result.recommended}.`;
      } catch (error) {
        if (version === revision)
          get("models-status").textContent = (error as Error).message;
      } finally {
        button.disabled = false;
        refresh();
      }
    })();
  });
  return {
    update(value: Snapshot, overwrite = true) {
      snapshot = value;
      if (overwrite) {
        const config = aiConfig(value.settings);
        get<HTMLSelectElement>("provider").value = config.provider;
        get<HTMLInputElement>("model").value = config.model;
        get<HTMLInputElement>("url").value = config.baseUrl;
        get<HTMLInputElement>("needs-key").checked = config.keyRequired;
        fillModels(value.aiVerified ? config.model : "auto");
        get<HTMLDetailsElement>("advanced").open =
          config.provider === "compatible" || config.provider === "ollama";
      }
      refresh();
    },
    read,
    clearKey() {
      get<HTMLInputElement>("key").value = "";
      refresh();
    },
  };
}
