import type { Diagnostic, LintSource } from "@codemirror/lint";
import { Parser as SqlParser, type Option as SqlParserOption } from "node-sql-parser";

import type { SqlLanguageId, SqlVariableRule } from "../../types";
import { getAllowedVariableRanges, overlapsAnyRange } from "../common/lint";

type SqlParserError = {
  location?: {
    start?: { offset?: number };
    end?: { offset?: number };
  };
};

const getSqlParserDatabase = (languageId: SqlLanguageId): "mysql" => {
  if (languageId === "sql") {
    return "mysql";
  }
  return "mysql";
};

const maskSqlTextForLint = (
  docText: string,
  allowedRanges: { from: number; to: number }[],
): string => {
  if (allowedRanges.length === 0) {
    return docText;
  }
  const out = docText.split("");
  for (const r of allowedRanges) {
    const from = Math.max(0, r.from);
    const to = Math.min(docText.length, r.to);
    for (let i = from; i < to; i += 1) {
      const ch = out[i];
      if (ch === "\n" || ch === "\r") {
        continue;
      }
      out[i] = "x";
    }
  }
  return out.join("");
};

export const createSqlSyntaxLinter = (
  languageId: SqlLanguageId,
  variableRules?: SqlVariableRule[],
): LintSource => {
  const sqlParser = new SqlParser();
  const parserOptions: SqlParserOption = {
    database: getSqlParserDatabase(languageId),
    trimQuery: false,
    parseOptions: { includeLocations: true },
  };
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

    const allowedVariableRanges = getAllowedVariableRanges(docText, variableRules);
    const maskedText = maskSqlTextForLint(docText, allowedVariableRanges);

    try {
      sqlParser.astify(maskedText, parserOptions);
    } catch (error) {
      const e = error as SqlParserError;
      const loc = e.location;
      const from = Math.max(0, Math.min(doc.length, loc?.start?.offset ?? 0));
      const to = Math.max(from, Math.min(doc.length, loc?.end?.offset ?? from));
      if (!overlapsAnyRange(allowedVariableRanges, from, to)) {
        diagnostics.push({
          from,
          to,
          severity: "error",
          message: "SQL语法错误",
          source: "sql-linter",
        });
      }
    }

    prevDiagnostics = diagnostics;
    return diagnostics;
  };
};
