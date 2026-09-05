import {compile} from '@mdx-js/mdx';
const cases = {
  htmlComment: '<!-- doc_type: how-to -->\n# H\n\nBody.\n',
  jsComment: '{/* doc_type: how-to */}\n# H\n\nBody.\n',
  frontmatter: '---\ndoc_type: how-to\n---\n\n# H\n\nBody.\n',
};
for (const [k,v] of Object.entries(cases)) {
  try { const out = await compile(v); console.log(k, 'OK', String(out).includes('doc_type') ? 'value-present-in-output' : 'value-absent'); }
  catch (e) { console.log(k, 'ERROR:', e.message.split('\n')[0]); }
}
console.log('mdx version', JSON.parse(await (await import('node:fs/promises')).readFile('node_modules/@mdx-js/mdx/package.json')).version);
