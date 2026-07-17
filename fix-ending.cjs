const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'components', 'InteractiveApp.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Find the marker for TAB 4: MANUAL BACKUPS
const marker = '            {/* TAB 4: MANUAL BACKUPS */}';
const index = content.indexOf(marker);

if (index === -1) {
  console.error("Marker not found!");
  process.exit(1);
}

// Keep everything before the marker
const beforeMarker = content.substring(0, index);

// Read clean ending from clean-ending.txt
const cleanEnding = fs.readFileSync(path.join(__dirname, 'clean-ending.txt'), 'utf8');

fs.writeFileSync(filePath, beforeMarker + cleanEnding, 'utf8');
console.log("Successfully fixed InteractiveApp.tsx ending via clean-ending.txt!");
