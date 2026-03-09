import {
  type Completion,
  type CompletionContext,
  type CompletionResult,
  type CompletionSource,
  snippetCompletion,
} from "@codemirror/autocomplete";
import { type SQLDialect } from "@codemirror/lang-sql";

import { CompletionBoost, SqlCompletionConfig } from "../../types";
import { matchSqlVariableContext } from "../common/variable";

const buildFunctionOptions = (
  config: SqlCompletionConfig["func"],
): Completion[] => {
  if (!config?.length) {
    return [];
  }
  return config.map((item) => {
    const name = item.label ?? item.key;
    return snippetCompletion(`${item.key}(\${})`, {
      label: name,
      detail: item.detail,
      type: "function",
      boost: 0.9,
    });
  });
};
/**
 * 函数补全源
 */
export const sqlFuncCompletionSource = (
  config: SqlCompletionConfig["func"],
  variableRules?: SqlCompletionConfig["variable"],
): ((context: CompletionContext) => CompletionResult | null) => {
  const funcOptions = buildFunctionOptions(config);

  return (context) => {
    // 排除变量上下文
    if (matchSqlVariableContext(context, variableRules)) {
      return null;
    }

    const regExp = /[A-Za-z_][\w$]*$/;
    const word = context.matchBefore(regExp);
    if (!word || word.from === word.to) {
      return null;
    }

    return {
      from: word.from,
      options: funcOptions,
      // 如果匹配就不会再触发补全源
      validFor: regExp,
    };
  };
};

const getOptionByRaw = (
  raw: string,
  upperCaseKeywords?: boolean,
  type?: string,
  boost?: CompletionBoost,
) => {
  const arr = raw?.split(" ") || [];
  return arr
    .map((v) => v.trim())
    .filter(Boolean)
    .map((kw) => {
      const text =
        upperCaseKeywords === true ? kw.toUpperCase() : kw.toLowerCase();
      return {
        label: text,
        type: type || "keyword",
        boost: boost || CompletionBoost.lowest,
      };
    });
};

export const sqlKeywordCompletionSource = (
  dialect: SQLDialect,
  variableRules?: SqlCompletionConfig["variable"],
  upperCaseKeywords?: boolean,
): CompletionSource => {
  // 拿到定义的关键字
  const keywordOptions = getOptionByRaw(
    dialect.spec.keywords || "",
    upperCaseKeywords,
    "keyword",
  );
  // 拿到定义的类型
  const typeOptions = getOptionByRaw(
    dialect.spec.types || "",
    upperCaseKeywords,
    "type",
  );

  const allOptions = [...keywordOptions, ...typeOptions];

  return (context: CompletionContext): CompletionResult | null => {
    // 排除变量上下文
    if (matchSqlVariableContext(context, variableRules)) {
      return null;
    }

    const regExp = /[A-Za-z_][\w$]*$/;
    const word = context.matchBefore(regExp);
    if (!word || word.from === word.to) {
      return null;
    }

    return {
      from: word.from,
      options: allOptions,
      validFor: regExp,
    };
  };
};
