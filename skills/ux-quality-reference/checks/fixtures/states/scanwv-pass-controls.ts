export function render(item: Item): string {
  return `
    <button aria-label="Close ${item.name}">${icon}</button>
    <button>Install ${item.name}</button>
    <label class="row"><span>Name</span> <input type="text" value="${item.name}" /></label>
    <label for="reg">Registry</label>
    <input id="reg" type="text" />
    <input type="hidden" name="token" value="${token}" />
    <a href="${item.url}">Read the guide</a>
  `;
}
