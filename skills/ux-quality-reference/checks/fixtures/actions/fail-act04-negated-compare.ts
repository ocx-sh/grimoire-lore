// Planted violation: UX-ACT-04. Esc and any unexpected value proceed.
export async function removeRegistry(alias: string) {
  const choice = await window.showWarningMessage(`Remove ${alias}?`, { modal: true }, 'Remove', 'No');
  if (choice !== 'No') {
    await doRemove(alias);
  }
}
