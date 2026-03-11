import esbuild from 'esbuild';

// Main process
await esbuild.build({
  entryPoints: ['src/main.ts'],
  bundle: true,
  platform: 'node',
  target: 'node18',
  outfile: 'main.js',
  external: ['electron', 'axios', 'ws'],
  format: 'cjs',
  sourcemap: false,
});

// Preload script
await esbuild.build({
  entryPoints: ['src/preload.ts'],
  bundle: true,
  platform: 'node',
  target: 'node18',
  outfile: 'preload.js',
  external: ['electron'],
  format: 'cjs',
  sourcemap: false,
});
