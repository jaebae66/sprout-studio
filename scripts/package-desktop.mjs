// Packages the built Sprout Study page (dist/) with Electron into release/Sprout Study-win32-x64/.
// Run through `npm run package:desktop`, which builds dist/ first.
import { packager } from '@electron/packager';

/** Only these are needed at runtime: React and friends are already bundled into dist/. */
const KEEP = /^\/(electron|dist|icons)(\/|$)|^\/package\.json$/;

const [folder] = await packager({
  dir: '.',
  name: 'Sprout Study',
  executableName: 'Sprout Study',
  platform: 'win32',
  arch: 'x64',
  out: 'release',
  overwrite: true,
  asar: true,
  prune: false,
  icon: 'icons/sprout-study.ico',
  ignore: (file) => Boolean(file) && !KEEP.test(file),
  win32metadata: { ProductName: 'Sprout Study', FileDescription: 'Sprout Study' },
});

console.log(`Packaged into ${folder}`);
