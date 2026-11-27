// Planted violation: UX-ACT-05. The confirm label is OK.
export async function overwrite(path: string) {
  const choice = await window.showWarningMessage(`Overwrite ${path}?`, { modal: true }, 'OK');
  if (choice === 'OK') {
    await write(path);
  }
}
