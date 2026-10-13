import { APP_LINKS, type AppLink } from "../shared/brand";
import { resultDialog } from "./dialogs";

export function addSiteLinks(root: HTMLElement) {
  const footer = document.createElement("footer");
  footer.className = "button-row site-links";
  footer.setAttribute("aria-label", "MISO website and policies");
  const labels: Record<AppLink, string> = {
    website: "MISO website",
    privacy: "Privacy policy",
    terms: "Terms of service",
  };
  for (const topic of Object.keys(labels) as AppLink[]) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.appLink = topic;
    button.textContent = labels[topic];
    button.title = `Open ${APP_LINKS[topic]} in your browser`;
    button.addEventListener("click", () => {
      void window.butler
        .help(topic)
        .catch(() =>
          resultDialog(
            "Could not open this page",
            `Open ${APP_LINKS[topic]} in your browser.`,
          ),
        );
    });
    footer.append(button);
  }
  root.querySelector(".settings-shell")!.append(footer);
}
