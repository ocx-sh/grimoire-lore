// Clean twin: the result is compared to a verb label, the label names the action,
// and the required prop has no default.
type ConfirmProps = { title: string; confirmLabel: string };
export async function overwrite(path: string) {
  const choice = await window.showWarningMessage(`Overwrite ${path}? Local edits are lost.`, { modal: true }, 'Overwrite');
  if (choice === 'Overwrite') {
    await write(path);
  }
}
const confirmLabel = 'Delete account'; // a call-site value, not a default
export const props: ConfirmProps = { title: 'Delete account', confirmLabel };
