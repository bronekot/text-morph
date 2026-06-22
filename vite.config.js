import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.js',
      name: 'TextMorph',
      formats: ['es', 'umd'],
      fileName: (format) => (format === 'es' ? 'text-morph.js' : 'text-morph.umd.cjs'),
    },
  },
});
