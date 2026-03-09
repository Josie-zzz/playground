import { parser } from "../parser.ts"
import { cases } from './case.js'


function escapeInline(str) {
  return str
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t");
}

function formatLezerTree(tree, source, options = {}) {
  const {
    includeRange = true,
    includeLeafText = true,
    maxLeafTextLength = 40,
  } = options;

  const cursor = tree.cursor();
  const lines = [];

  function walk(depth) {
    const indent = "  ".repeat(depth);
    let line = `${indent}${cursor.name}`;

    if (includeRange) {
      line += ` [${cursor.from}, ${cursor.to}]`;
    }

    const hasChild = cursor.firstChild();
    if (hasChild) {
      lines.push(line);
      do {
        walk(depth + 1);
      } while (cursor.nextSibling());
      cursor.parent();
      return;
    }

    if (includeLeafText && typeof source === "string" && cursor.to > cursor.from) {
      const raw = source.slice(cursor.from, cursor.to);
      const compact = escapeInline(raw);
      const text = compact.length > maxLeafTextLength ? `${compact.slice(0, maxLeafTextLength)}…` : compact;
      line += `: "${text}"`;
    }

    lines.push(line);
  }

  walk(0);
  return lines.join("\n");
}


const input = cases[cases.length - 1]

console.log("Testing parser with input:");
console.log(input);
console.log("\nParsing...");

try {
  let tree = parser.parse(input)
  console.log("Parsed successfully!");
  //  console.log(tree.toString());
  console.log(formatLezerTree(tree, input));
} catch (e) {
  console.error("Parse failed:", e);
}
