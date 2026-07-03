// Usage: node make-words.js input.txt words.js
const fs = require("fs");

const [, , inputPath, outputPath = "words.js"] = process.argv;

if (!inputPath) {
  console.error("Usage: node make-words.js <input.txt> [output.js]");
  process.exit(1);
}

const raw = fs.readFileSync(inputPath, "utf8");

// Split on newlines, trim whitespace, drop empty lines, dedupe
const words = [...new Set(
  raw
    .split(/\r?\n/)
    .map(w => w.trim())
    .filter(Boolean)
)];

const body = words
  .map(w => `  "${w.replace(/"/g, '\\"')}",`)
  .join("\n");

const output = `export const WORDS = [\n${body}\n];\n`;

fs.writeFileSync(outputPath, output, "utf8");

console.log(`Wrote ${words.length} words to ${outputPath}`);