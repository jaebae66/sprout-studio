// Reading and writing notes as `<name>.md` files in a vault folder. Shared by the desktop
// app (main.cjs) and the Sprout Studio MCP server (mcp/server.mjs), so both follow the
// same rules about which names are safe.
const fs = require('node:fs');
const path = require('node:path');

/** Same rule as cleanNoteName in src/study/lib/notes.ts: nothing that could leave the vault folder. */
const UNSAFE_NAME = /[\\/:*?"<>|#^[\]\n\r\t\0]/;

/** The file for a note, or throws if the name could reach outside the vault. */
function noteFile(folder, name) {
  if (typeof name !== 'string' || !name.trim() || name.length > 120 || UNSAFE_NAME.test(name) || /^\.|\.$/.test(name)) {
    throw new Error(`Not a valid note name: ${name}`);
  }
  const file = path.join(folder, `${name}.md`);
  if (path.dirname(file) !== path.resolve(folder)) throw new Error(`Not a valid note name: ${name}`);
  return file;
}

/** Every note in the vault (top level only), as { name, body, updated }. */
function listNotes(folder) {
  return fs
    .readdirSync(folder, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.md'))
    .map((entry) => {
      const file = path.join(folder, entry.name);
      return { name: entry.name.slice(0, -3), body: fs.readFileSync(file, 'utf8'), updated: fs.statSync(file).mtimeMs };
    });
}

function writeNote(folder, name, body) {
  fs.writeFileSync(noteFile(folder, name), String(body), 'utf8');
}

module.exports = { noteFile, listNotes, writeNote };
