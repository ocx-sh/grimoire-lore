export function render(item: Item): string {
  return `
    <button class="icon" title="Manage"><svg viewBox="0 0 8 8"><path d="M0 0"/></svg></button>
    <button class="icon" title="More options"><svg viewBox="0 0 8 8"><path d="M0 0"/></svg></button>
    <button class="chip-remove"><svg viewBox="0 0 8 8"><path d="M0 0"/></svg></button>
    <button aria-label="Close ${item.name}"><svg viewBox="0 0 8 8"><path d="M0 0"/></svg></button>
    <button>Install</button>
    <input type="text" placeholder="Search" />
  `;
}
