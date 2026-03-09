import { format } from "sql-formatter";

import { defaultFormatOptions } from "../../constants";
import type { SqlVariableRule } from "../../types";
import { getRegExpByTagName } from "../common/variable";

/**
 * 格式化 SQL 文本，支持变量替换
 */
export const createSqlFormatText =
  (variableRules: SqlVariableRule[]) => (text: string) => {
    try {
      let maskedText = text;
      const tokenToValue = new Map<string, string>();
      let tokenIndex = 0;

      for (const rule of variableRules) {
        const startTag = rule?.startTag;
        const endTag = rule?.endTag;
        if (!startTag || !endTag) {
          continue;
        }

        const pattern = getRegExpByTagName(startTag, endTag);

        maskedText = maskedText.replace(pattern, (original) => {
          const token = `__CM_VAR_${tokenIndex++}__`;
          tokenToValue.set(token, original);
          return token;
        });
      }

      const formatted = format(maskedText, {
        language: "sql",
        tabWidth: defaultFormatOptions.indentSize,
        keywordCase: defaultFormatOptions.keywordCase,
      });

      return formatted.replace(
        /__CM_VAR_\d+__/g,
        (token) => tokenToValue.get(token) || "",
      );
    } catch (e) {
      console.error("SQL 格式化失败", e);
      return text;
    }
  };
