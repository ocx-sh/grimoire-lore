import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig } from 'vite'

const layerWrap = {
  style: ({ content }) => ({ code: `@layer svelte-lib {\n${content}\n}` }),
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [svelte({ preprocess: process.env.WRAP_LAYER ? layerWrap : undefined })],
  build: { outDir: process.env.WRAP_LAYER ? 'dist-layer' : 'dist' },
})
