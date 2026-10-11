// Packages the built Sprout Studio page (dist/) with Electron for the system it runs on:
// release/Sprout Studio-win32-x64/ on Windows, release/Sprout Studio-linux-x64/ on Linux.
// Run through `npm run package:desktop`, which builds dist/ first.
import { packager } from '@electron/packager';

/** Only these are needed at runtime: React and friends are already bundled into dist/. */
const KEEP = /^\/(electron|dist|icons)(\/|$)|^\/package\.json$/;

const [folder] = await packager({
  dir: '.',
  name: 'Sprout Studio',
  executableName: 'Sprout Studio',
  platform: process.platform,
  arch: process.arch,
  out: 'release',
  overwrite: true,
  asar: true,
  prune: false,
  icon: process.platform === 'win32' ? 'icons/sprout-study.ico' : 'icons/sprout-study.png',
  ignore: (file) => Boolean(file) && !KEEP.test(file),
  win32metadata: { ProductName: 'Sprout Studio', FileDescription: 'Sprout Studio' },
});

console.log(`Packaged into ${folder}`);
