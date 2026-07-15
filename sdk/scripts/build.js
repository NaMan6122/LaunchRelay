const esbuild = require('esbuild');
const args = process.argv.slice(2);
const watch = args.includes('--watch');

async function build() {
  const config = {
    entryPoints: ['src/index.ts'],
    outfile: 'dist/widget.js',
    bundle: true,
    minify: true,
    format: 'iife',
    globalName: 'LaunchRelay',
    target: 'es2020',
    platform: 'browser',
  };

  if (watch) {
    const ctx = await esbuild.context(config);
    await ctx.watch();
    console.log('Watching for changes...');
  } else {
    await esbuild.build(config);
    console.log('Build complete: dist/widget.js');
  }
}

build().catch(err => {
  console.error(err);
  process.exit(1);
});
