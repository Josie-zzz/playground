import { autocompletion } from "@codemirror/autocomplete";
import { sql } from "@codemirror/lang-sql";
import { linter } from "@codemirror/lint";

import { defaultFormatOptions } from "../../constants";
import type { EditorLanguageConfig, SqlLanguageOptions } from "../../types";
import { SqlLanguageId } from "../../types";
import { mergeSqlFuncRules, mergeVariableRules } from "../common/merge";
import {
  sqlVariableHighlight,
  variableCompletionSource,
} from "../common/variable";
import {
  sqlFuncCompletionSource,
  sqlKeywordCompletionSource,
} from "./completion";
import { getDialectBylangID } from "./constants";
import { createSqlFormatText } from "./format";
// import { createSqlSyntaxLinter } from "./linter";

export const createSqlLanguageConfig = (
  languageConfig?: SqlLanguageOptions,
  languageId: SqlLanguageId = "sql",
): EditorLanguageConfig => {
  const dialectConfig = getDialectBylangID(languageId);
  const variableRules = mergeVariableRules(
    dialectConfig.completion?.variable || [],
    languageConfig?.completion?.variable,
  );
  const funcRules = mergeSqlFuncRules(
    dialectConfig.completion?.func || [],
    languageConfig?.completion?.func,
  );
  const dialect = dialectConfig.dialect(funcRules);
  const upperCaseKeywords = defaultFormatOptions.keywordCase === "upper";

  return {
    id: languageId,
    label: dialectConfig.label || "SQL",
    placeholder: dialectConfig.placeholder,
    extensions: [
      sql({
        dialect,
        upperCaseKeywords,
      }),
      // linter(createSqlSyntaxLinter(languageId, variableRules)),
      sqlVariableHighlight(variableRules),
      autocompletion({
        activateOnTyping: true,
        override: [
          sqlKeywordCompletionSource(dialect, variableRules, upperCaseKeywords),
          sqlFuncCompletionSource(funcRules, variableRules),
          variableCompletionSource(variableRules),
        ],
      }),
    ],
    formatText: createSqlFormatText(variableRules),
  };
};
