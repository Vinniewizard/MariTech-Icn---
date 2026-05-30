import fs from 'fs';
import path from 'path';

function replaceInFile(filePath) {
  const code = fs.readFileSync(filePath, 'utf8');
  let newCode = code;

  // Colors
  newCode = newCode.replace(/cyan/g, 'yellow');
  newCode = newCode.replace(/teal/g, 'yellow');
  newCode = newCode.replace(/indigo/g, 'yellow');
  newCode = newCode.replace(/blue-500/g, 'yellow-500'); // Some gradient colors
  newCode = newCode.replace(/blue-600/g, 'yellow-600'); 

  // Names
  newCode = newCode.replace(/MariTech Banking Ledger/gi, 'LWEX exchange');
  newCode = newCode.replace(/MariTech/g, 'LWEX');
  newCode = newCode.replace(/MARITECH/g, 'LWEX');
  newCode = newCode.replace(/maritech/g, 'lwex');

  if (newCode !== code) {
    fs.writeFileSync(filePath, newCode, 'utf8');
    console.log('Updated ' + filePath);
  }
}

const dirs = ['src', 'src/components', 'src/lib', '.'];
for (const dir of dirs) {
  if (!fs.existsSync(dir)) continue;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      replaceInFile(path.join(dir, file));
    }
  }
}
