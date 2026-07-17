const fs = require('fs');
const content = fs.readFileSync('src/components/InteractiveApp.tsx', 'utf8');

const lines = content.split('\n');

const stack = [];
let inSingleComment = false;
let inMultiComment = false;
let inString = null;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  inSingleComment = false;
  
  for (let j = 0; j < line.length; j++) {
    const char = line[j];
    const nextChar = line[j + 1];
    
    if (inSingleComment) continue;
    if (inMultiComment) {
      if (char === '*' && nextChar === '/') {
        inMultiComment = false;
        j++;
      }
      continue;
    }
    if (inString) {
      if (char === '\\') {
        j++;
      } else if (char === inString) {
        inString = null;
      }
      continue;
    }
    if (char === '/' && nextChar === '/') {
      inSingleComment = true;
      j++;
      continue;
    }
    if (char === '/' && nextChar === '*') {
      inMultiComment = true;
      j++;
      continue;
    }
    if (char === '"' || char === "'" || char === '`') {
      inString = char;
      continue;
    }
    
    // Parse tags: <tag or </tag or />
    if (char === '<' && nextChar !== ' ' && nextChar !== '=' && nextChar !== '<') {
      // Check if it's a closing tag
      if (nextChar === '/') {
        // Closing tag </name> or </>
        let name = '';
        let k = j + 2;
        while (k < line.length && line[k] !== '>') {
          name += line[k];
          k++;
        }
        name = name.trim().split(' ')[0];
        // Pop matching tag from stack
        let found = false;
        for (let s = stack.length - 1; s >= 0; s--) {
          if (stack[s].name === name) {
            stack.splice(s, 1);
            found = true;
            break;
          }
        }
        if (!found) {
          console.log(`Unmatched closing tag </${name}> at line ${i + 1}:${j}`);
        }
        j = k;
      } else if (nextChar === '!') {
        // Comment or DOCTYPE, skip
      } else {
        // Opening tag <name...
        let name = '';
        let k = j + 1;
        while (k < line.length && line[k] !== ' ' && line[k] !== '>' && line[k] !== '/') {
          name += line[k];
          k++;
        }
        name = name.trim();
        
        // Check if self-closing
        let isSelfClosing = false;
        let s = k;
        while (s < line.length && line[s] !== '>') {
          if (line[s] === '/' && line[s+1] === '>') {
            isSelfClosing = true;
            break;
          }
          s++;
        }
        if (!isSelfClosing) {
          // If it's a standard self-closing HTML tag (like input, img, hr, br), it's self-closing
          const selfClosingTags = ['input', 'img', 'br', 'hr', 'meta', 'link'];
          if (selfClosingTags.includes(name.toLowerCase())) {
            isSelfClosing = true;
          }
        }
        
        if (name && !isSelfClosing) {
          stack.push({ name, line: i + 1, char: j });
        }
        j = s;
      }
    }
  }
}

console.log('--- Unclosed HTML Tags ---');
stack.forEach(item => {
  console.log(`Unclosed <${item.name}> opened at line ${item.line}`);
});
