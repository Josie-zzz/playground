import { autocompletion } from "@codemirror/autocomplete";
import { linter } from "@codemirror/lint";

import { defaultFormatOptions } from "../../constants";
import type { EditorLanguageConfig, SqlLanguageOptions } from "../../types";
import { SqlLanguageId } from "../../types";
import { createDefaultLinter } from "../common/lint";
import { mergeSqlFuncRules, mergeVariableRules } from "../common/merge";
import {
  sqlVariableHighlight,
  variableCompletionSource,
} from "../common/variable";
import {
  fmDirectiveCompletionSource,
  fmFunctionCompletionSource,
} from "../freemarker/completion";
import { completion as fmCompletion } from "../freemarker/constants";
import {
  sqlFuncCompletionSource,
  sqlKeywordCompletionSource,
} from "../sql/completion";
import { getDialectBylangID } from "../sql/constants";
import { createFmSqlFormatText } from "./formatText";
import { createFmSqlLinter } from "./linter";
import { fmSql } from "./register";
import { fltLinter } from "../freemarker/linter";

export const createFmSqlLanguageConfig = (
  languageConfig?: SqlLanguageOptions,
  language?: SqlLanguageId,
): EditorLanguageConfig => {
  const dialectConfig = getDialectBylangID(language);
  const sqlFuncRules = mergeSqlFuncRules(
    dialectConfig.completion?.func || [],
    languageConfig?.completion?.func,
  );
  const variableRules = mergeVariableRules(
    mergeVariableRules(
      dialectConfig?.completion?.variable,
      fmCompletion.variable,
    ),
    languageConfig?.completion?.variable,
  );
  const dialect = dialectConfig.dialect(sqlFuncRules);
  const langExtension = fmSql(dialect);
  const upperCaseKeywords = defaultFormatOptions.keywordCase === "upper";

  return {
    id: "fm-sql",
    label: "FM-SQL",
    placeholder:
      "<#if userId??>\n  SELECT id, name\n  FROM users\n  WHERE id = ${userId};\n</#if>\n",
    extensions: [
      langExtension.fmSqlLang,
      // 用默认的，只会遍历fm的语法树节点
      linter(createDefaultLinter([], "freemarker-linter")),
      // fltLinter,
      // 这个是把sql摘出来，其他用占位符替换，每次变化都会重新parser一下，文本大了会有性能问题
      // 后续考虑是不是可以去掉，因为sql默认的lint规则校验也很弱
      // linter(
      //   createFmSqlLinter(langExtension.sqlLang.language.parser, variableRules),
      // ),
      sqlVariableHighlight(variableRules),
      autocompletion({
        activateOnTyping: true,
        override: [
          fmDirectiveCompletionSource,
          fmFunctionCompletionSource(fmCompletion.func),
          // todo：需要优化一下，在标签中会触发sql的不全提示
          sqlKeywordCompletionSource(dialect, variableRules, upperCaseKeywords),
          sqlFuncCompletionSource(sqlFuncRules, variableRules),

          variableCompletionSource(variableRules),
        ],
      }),
    ],
    formatText: createFmSqlFormatText(variableRules),
  };
};
