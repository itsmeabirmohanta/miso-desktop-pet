export function choiceDialog(
  title: string,
  message: string,
  choices: { label: string; value: string }[],
): Promise<string | undefined> {
  return new Promise((resolve) => {
    const dialog = document.createElement("dialog");
    dialog.className = "confirm-dialog";
    const heading = document.createElement("h2");
    heading.textContent = title;
    const body = document.createElement("p");
    body.textContent = message;
    dialog.append(heading, body);
    const actions = document.createElement("div");
    actions.className = "dialog-actions";
    dialog.append(actions);
    let ended = false;
    const finish = (value?: string) => {
      if (ended) return;
      ended = true;
      dialog.close();
      dialog.remove();
      resolve(value);
    };
    for (const choice of choices) {
      const button = document.createElement("button");
      button.textContent = choice.label;
      if (choices.length === 1)
        button.className = /delete|remove|reset/i.test(choice.label)
          ? "danger"
          : "primary";
      button.onclick = () => finish(choice.value);
      actions.append(button);
    }
    const cancel = document.createElement("button");
    cancel.textContent = "Cancel";
    cancel.onclick = () => finish();
    actions.append(cancel);
    dialog.oncancel = (e) => {
      e.preventDefault();
      finish();
    };
    document.body.append(dialog);
    dialog.showModal();
    cancel.focus();
  });
}
export async function confirmDialog(
  title: string,
  message: string,
  label = "Confirm",
) {
  return (
    (await choiceDialog(title, message, [{ label, value: "yes" }])) === "yes"
  );
}
export async function resultDialog(title: string, message: string) {
  await choiceDialog(title, message, [{ label: "OK", value: "ok" }]);
}
