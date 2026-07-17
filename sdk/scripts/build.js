const esbuild = require('esbuild');
const args = process.argv.slice(2);
const watch = args.includes('--watch');

const entries = [
  { entryPoints: ['src/index.ts'], outfile: 'dist/widget.js', globalName: 'LaunchRelay' },
  { entryPoints: ['src/pixel.ts'], outfile: 'dist/pixel.js', globalName: undefined },
];

async function buildAll() {
  const configs = entries.map((e) => ({
    entryPoints: e.entryPoints,
    outfile: e.outfile,
    bundle: true,
    minify: true,
    format: 'iife',
    globalName: e.globalName,
    target: 'es2020',
    platform: 'browser',
  }));

  if (watch) {
    const ctxs = await Promise.all(configs.map((c) => esbuild.context(c)));
    console.log(`Watching ${entries.length} files...`);
    await Promise.all(ctxs.map((ctx) => ctx.watch()));
  } else {
    await Promise.all(configs.map((c) => esbuild.build(c)));
    console.log(`Build complete: ${entries.map((e) => e.outfile).join(', ')}`);
  }
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
