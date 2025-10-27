import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/react/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  minify: false,
  splitting: false,
  treeshake: true,
  target: 'es2020',
  outDir: 'dist',
  external: ['react', 'react-dom'],
});

