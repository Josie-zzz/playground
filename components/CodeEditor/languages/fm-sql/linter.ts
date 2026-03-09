import { syntaxTree } from "@codemirror/language";
import type { Diagnostic, LintSource } from "@codemirror/lint";
import { Parser as SqlParser, type Option as SqlParserOption } from "node-sql-parser";

import type { SqlVariableRule } from "../../types";
import { getAllowedVariableRanges, overlapsAnyRange } from "../common/lint";
import { buildLintSqlText, collectTemplateRangesFromCursor } from "./mask";

const buildSqlTextFromTemplate = (
  view: Parameters<LintSource>[0],
  docText: string,
): string => {
  try {
    const ranges = collectTemplateRangesFromCursor(
      syntaxTree(view.state).cursor(),
    );
    return buildLintSqlText(docText, ranges);
  } catch {
    return docText;
  }
};

/** 针对freemarker中的sql的校验 */
export const createFmSqlLinter = (
  variableRules?: SqlVariableRule[],
  sqlParserOptions?: SqlParserOption,
): LintSource => {
  const sqlParser = new SqlParser();
  let prevDocText = "";
  let prevDiagnostics: Diagnostic[] = [];
  return (view) => {
    const diagnostics: Diagnostic[] = [];
    const doc = view.state.doc;
    const docText = doc.toString();
    if (prevDocText === docText) {
      return prevDiagnostics;
    }
    prevDocText = docText;
    const allowedVariableRanges = getAllowedVariableRanges(
      docText,
      variableRules,
    );

    // 先占位符替换，在用sqlParser解析遍历语法树
    const sqlText = buildSqlTextFromTemplate(view, docText);
    try {
      sqlParser.astify(sqlText, {
        database: "mysql",
        trimQuery: false,
        parseOptions: { includeLocations: true },
        ...(sqlParserOptions ?? {}),
      });
    } catch (error) {
      const anyError = error as any;
      const loc = anyError?.location;
      const from = Math.max(0, Math.min(doc.length, loc?.start?.offset ?? 0));
      const to = Math.max(from, Math.min(doc.length, loc?.end?.offset ?? from));
      if (!overlapsAnyRange(allowedVariableRanges, from, to)) {
        const line = doc.lineAt(from);
        diagnostics.push({
          from,
          to,
          severity: "error",
          message: `${line.number}行：SQL语法错误`,
          source: "sql-linter",
        });
      }
    }

    prevDiagnostics = diagnostics;
    return diagnostics;
  };
};
