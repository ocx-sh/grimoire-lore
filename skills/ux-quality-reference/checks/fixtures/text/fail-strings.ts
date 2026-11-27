// planted violations, one per arm of text_scan.py
export const messages = {
  party: 'Saved the file 🎉',
  joke: 'Oops, that did not work',
  polite: 'Please try again',
  bang: 'Welcome back!',
  generic: 'Something went wrong',
  prompt: 'Did you mean add?',
  plural: `${n} file(s) removed, see http(s)://example.com`,
  swap: `${n} ${n === 1 ? 'file' : 'files'} removed`,
  click: 'Click Install to continue',
  latin: 'Pick a registry, e.g. the default one',
  amp: 'Filter & sort',
  size: `${(size / 1024).toFixed(1)} KB`,
  ago: `${mins} min ago`,
  locale: new Intl.NumberFormat('en-US'),

  link: '<a href="/docs">here</a>',
};
vscode.window.showInformationMessage('Done');
vscode.window.showWarningMessage(message, yes, 'No');
throw new Error("invalid mode");
