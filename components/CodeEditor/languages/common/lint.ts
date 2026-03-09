import { syntaxTree } from "@codemirror/language";
import type { Diagnostic, LintSource } from "@codemirror/lint";

import type { SqlVariableRule } from "../../types";
import { getRegExpByTagName } from "../common/variable";

// 通用lint，遍历语法树，以及放过自定义变量

export const getAllowedVariableRanges = (
  text: string,
  variableRules: SqlVariableRule[] | undefined,
): { from: number; to: number }[] => {
  const rules = variableRules ?? [];
  const ranges: { from: number; to: number }[] = [];

  if (rules.length === 0) {
    return ranges;
  }

  for (const rule of rules) {
    const { startTag, endTag } = rule;
    if (!startTag || !endTag) {
      continue;
    }

    // 允许放过的完整变量
    const allowedFullMatch = new Set<string>();
    for (const option of rule.options ?? []) {
      const raw = option.key;
      if (!raw) {
        continue;
      }
      const withStart = raw.startsWith(startTag) ? raw : `${startTag}${raw}`;
      const full = withStart.endsWith(endTag)
        ? withStart
        : `${withStart}${endTag}`;
      allowedFullMatch.add(full);
    }
    if (allowedFullMatch.size === 0) {
      continue;
    }

    // 找到匹配的部分的范围
    const regex = getRegExpByTagName(startTag, endTag);
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      const matchText = match[0];
      if (!allowedFullMatch.has(matchText)) {
        continue;
      }
      const from = match.index;
      const to = from + matchText.length;
      if (from < to) {
        ranges.push({ from, to });
      }
    }
  }

  // 排序范围，确保不会有重叠
  ranges.sort((a, b) => a.from - b.from || a.to - b.to);
  return ranges;
};

/**
 * 如果错误落在允许放过的完整变量范围内，就直接跳过
 */
export const overlapsAnyRange = (
  ranges: { from: number; to: number }[],
  from: number,
  to: number,
): boolean => {
  for (const r of ranges) {
    if (r.to <= from) {
      continue;
    }
    if (r.from >= to) {
      break;
    }
    return true;
  }
  return false;
};

export const createDefaultLinter =
  (variableRules?: SqlVariableRule[], sourceName?: string): LintSource =>
  (view) => {
    const diagnostics: Diagnostic[] = [];
    const tree = syntaxTree(view.state);
    const allowedVariableRanges = getAllowedVariableRanges(
      view.state.doc.toString(),
      variableRules,
    );

    tree.iterate({
      enter: (node) => {
        if (!node.type.isError) {
          return;
        }
        if (overlapsAnyRange(allowedVariableRanges, node.from, node.to)) {
          return;
        }
        const line = view.state.doc.lineAt(node.from);
        diagnostics.push({
          from: node.from,
          to: node.to,
          severity: "error",
          message: `${line.number}行：语法错误`,
          source: sourceName || "linter",
        });
      },
    });

    return diagnostics;
  };
