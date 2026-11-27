// Planted violation: UX-ACT-06. The confirm label is optional, so a call site can omit it.
type ConfirmProps = { title: string; confirmLabel?: string };
export function Confirmation({ title, confirmLabel }: ConfirmProps) {
  return <dialog><h2>{title}</h2><button>Cancel</button><button>{confirmLabel ?? 'Confirm'}</button></dialog>;
}
