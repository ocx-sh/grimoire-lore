// Planted violation: UX-ACT-05. A generic message that names no object.
export function DeleteButton({ onDelete }: { onDelete: () => void }) {
  return <button onClick={() => { if (window.confirm('Are you sure?')) onDelete(); }}>Delete account</button>;
}
