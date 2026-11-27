// the same situations, written as the rules ask
const plural = new Intl.PluralRules(undefined);
const bytes = new Intl.NumberFormat(undefined, { style: 'unit', unit: 'kilobyte' });
export const messages = {
  saved: 'Saved grimoire.toml',
  refresh: '$(refresh) Refresh catalog',
  error: 'Could not read mytool.toml: the file is not valid TOML',
  hint: 'Use http(s):// links only',
  select: 'Select Install to continue',
  example: 'Pick a registry, for example the default one',
  both: 'Filter and sort',
  size: `${Math.round(size / 1024)} KiB`,

  link: '<a href="/docs">Read the install guide</a>',
  copied: `Copied the install command for ${name}`,
};
vscode.window.showInformationMessage('Created grimoire.toml');
vscode.window.showWarningMessage(message, 'Install update', 'Cancel');
throw new Error("invalid mode x (expected env, bin or none)");
