import { parser as freemarkerParser } from "@/freemarker";

import { defaultFormatOptions } from "../../constants";
import type { SqlVariableRule } from "../../types";
import { createFltFormatText } from "../freemarker/formatText";
import { createSqlFormatText } from "../sql/format";
import {
  collectTemplateRangesFromCursor,
  maskForFormat,
  unmaskFormat,
} from "./mask";

// 因为sql 格式化的时候会把fm语法用占位符替换，会导致 , ; 换行，所以最后这里修复一下
const fixStandaloneCommaIndent = (text: string) => {
  /** 按行处理，修复被 SQL formatter 强制换行的标点 */
  const lines = text.split("\n");

  /** 找到当前行之前最近的非空行索引 */
  const findPrevNonEmptyLineIndex = (index: number) => {
    for (let i = index - 1; i >= 0; i -= 1) {
      if ((lines[i] ?? "").trim() !== "") {
        return i;
      }
    }
    return -1;
  };

  for (let i = 0; i < lines.length; i += 1) {
    /** 当前行文本 */
    const line = lines[i] ?? "";

    /**
     * 目标场景：
     * 1) 标点单独成行："," 或 ";"
     * 2) 标点跑到行首：", xxx" 或 "; xxx"
     * 复原规则：标点要紧跟前一行的最后一个字符
     */
    const match = line.match(/^(\s*)([,;])(\s*)(.*)$/);
    if (!match) {
      continue;
    }

    /** 当前行缩进 */
    const indent = match[1] ?? "";
    /** 当前行标点 */
    const punctuation = match[2] as "," | ";";
    /** 标点后剩余内容 */
    const rest = match[4] ?? "";

    /** 前一个非空行索引 */
    const prevIndex = findPrevNonEmptyLineIndex(i);
    if (prevIndex < 0) {
      continue;
    }

    /** 前一个非空行文本 */
    const prevLine = lines[prevIndex] ?? "";
    lines[prevIndex] = `${prevLine.replace(/\s+$/g, "")}${punctuation}`;

    if (rest.trim() === "") {
      lines.splice(i, 1);
      i -= 1;
      continue;
    }

    lines[i] = `${indent}${rest.replace(/^\s+/g, "")}`;
  }

  return lines.join("\n");
};

export const createFmSqlFormatText = (variableRules: SqlVariableRule[]) => {
  /** freemarker 格式化器 */
  const fltFormatText = createFltFormatText({
    indentSize: defaultFormatOptions.indentSize,
    preserveTextIndent: true,
  });
  /** SQL 格式化器 */
  const sqlFormatText = createSqlFormatText(variableRules);

  /** fm-sql 的整体格式化：先 mask 非 Text，再格式化 SQL，最后恢复并格式化 freemarker */
  return (text: string) => {
    try {
      // 先占位符替换，再格式化 SQL
      const ranges = collectTemplateRangesFromCursor(
        freemarkerParser.parse(text).cursor(),
      );
      const { masked, tokenToValue } = maskForFormat(text, ranges);
      const sqlFormattedMasked = sqlFormatText(masked);
      // 恢复占位符
      const restored = unmaskFormat(sqlFormattedMasked, tokenToValue);
      // 最后用 freemarker 格式化
      return fixStandaloneCommaIndent(fltFormatText(restored));
    } catch (e) {
      console.error("fm-sql 格式化失败", e);
      return text;
    }
  };
};
