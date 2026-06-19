const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const outputDir = path.join(root, 'public');

const entriesToCopy = [
  '404.html',
  'assets',
  'contact.html',
  'gallery.html',
  'index.html',
  'shop.html',
  'videos.html',
];

fs.rmSync(outputDir, { force: true, recursive: true });
fs.mkdirSync(outputDir, { recursive: true });

for (const entry of entriesToCopy) {
  const source = path.join(root, entry);
  if (!fs.existsSync(source)) {
    throw new Error(`Build input is missing: ${entry}`);
  }

  fs.cpSync(source, path.join(outputDir, entry), {
    filter: (sourcePath) => path.basename(sourcePath) !== '.DS_Store',
    recursive: true,
  });
}

removeFilesNamed(outputDir, '.DS_Store');

console.log(`Netlify static site built in ${path.relative(root, outputDir)}`);

function removeFilesNamed(directory, filename) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      removeFilesNamed(entryPath, filename);
      continue;
    }

    if (entry.name === filename) {
      fs.rmSync(entryPath);
    }
  }
}
