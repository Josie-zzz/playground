import { SQLDialect, sql } from "@codemirror/lang-sql";
import { LRLanguage, LanguageSupport } from "@codemirror/language";
import { parseMixed, SyntaxNode, SyntaxNodeRef } from "@lezer/common";

import { defaultFormatOptions } from "../../constants";
import { flt, fltLanguage } from "../freemarker/register";

/**
 * 创建 fm-sql 的语言支持：
 * - 宿主语法树使用 FreeMarker parser（保证 <#...> 与 ${...} 的语法/高亮由 FreeMarker 接管）
 * - 在 FreeMarker 的 Text 节点范围内，叠加一层 SQL parser（用于 SQL 关键字/语法高亮与诊断）
 */
export const fmSql = (dialect: SQLDialect) => {
  /** SQL 子语言（用于 overlay 解析） */
  const sqlLang = sql({
    dialect,
    upperCaseKeywords: defaultFormatOptions.keywordCase === "upper",
  });

  // 是否允许被 SQL overlay 解析的 FreeMarker 节点类型
  const isSqlOverlayNodeName = (
    node: SyntaxNodeRef | SyntaxNode | null | undefined,
  ) => {
    if (!node) {
      return false;
    }
    const stableNode =
      "node" in node ? (node.node as SyntaxNode) : (node as SyntaxNode);
    // 当前节点或者父节点是text节点
    return node.name === "Text" || stableNode.parent?.name === "Text";
  };
  /** 是否为 SQL 字符串的引号字符（目前只处理单双引号） */
  const isQuoteChar = (ch: string) => ch === "'" || ch === '"';

  const mixedFmSqlLanguage = (fltLanguage as LRLanguage).configure({
    wrap: parseMixed((node, input) => {
      if (!isSqlOverlayNodeName(node)) {
        return null;
      }
      const stableNode = node.node;
      /** 当前 Text 节点的原始文本 */
      const text = input.read(stableNode.from, stableNode.to);
      const trimmed = text.trim();
      if (!trimmed) {
        return null;
      }

      // 逻辑：为了避免同一段连续 Text 被重复挂载 overlay，只在“连续 Text 的第一个节点”挂载
      if (
        stableNode.prevSibling &&
        isSqlOverlayNodeName(stableNode.prevSibling)
      ) {
        return null;
      }

      let from = stableNode.from;
      let to = stableNode.to;
      let lastTextNode = stableNode;
      let nextText = stableNode.nextSibling;
      // 把连续的 Text 合并成一个 SQL overlay，保证 SQL parser 能看到更完整的上下文（关键字高亮更稳定）
      while (nextText && isSqlOverlayNodeName(nextText)) {
        to = nextText.to;
        lastTextNode = nextText;
        nextText = nextText.nextSibling;
      }

      // 备注：下面这两段是为了处理，因为被fm的插值拆分开的sql，从而导致两段sql片段的parser解析错误，无法正确高亮的问题
      // eg: SELECT
      //         p
      //     FROM
      //         s
      //     WHERE
      //         p_date >= '${Vars.startDate}'
      //     GROUP BY --这里的GROUP BY没有正常染色
      //         p_date
      // 处理 "'${...}"：如果插值左侧与当前段 Text 两边都是引号，跳过开头引号，避免 SQL 进入字符串态
      const prev = stableNode.prevSibling;
      const prevPrev = prev?.prevSibling;
      if (
        prev?.name === "Interpolation" &&
        prevPrev?.name === "Text" &&
        text.length > 0 &&
        isQuoteChar(text[0])
      ) {
        const prevPrevText = input.read(prevPrev.from, prevPrev.to);
        if (
          prevPrevText.length > 0 &&
          isQuoteChar(prevPrevText[prevPrevText.length - 1])
        ) {
          // 不要把引号算进去，不然sql parser会有问题
          from += 1;
        }
      }

      // 处理 "${...}'"：如果当前段 Text 末尾与插值右侧两边都是引号，排除结尾引号，避免 SQL 字符串态错位
      const lastText = input.read(lastTextNode.from, lastTextNode.to);
      const next = lastTextNode.nextSibling;
      const nextNext = next?.nextSibling;
      if (
        next?.name === "Interpolation" &&
        nextNext?.name === "Text" &&
        lastText.length > 0 &&
        isQuoteChar(lastText[lastText.length - 1])
      ) {
        const nextNextText = input.read(nextNext.from, nextNext.to);
        if (nextNextText.length > 0 && isQuoteChar(nextNextText[0])) {
          to -= 1;
        }
      }
      if (from >= to) {
        return null;
      }

      // eslint-disable-next-line no-console
      console.log(input.read(from, to), '---here---');

      return {
        parser: sqlLang.language.parser,
        // 这里使用了overlay，这样sql 的语法树节点不会显示的出现在fm的语法树中，而是作为一个叠加树标记在Text节点上面
        overlay: [{ from, to }],
      };
    }),
  });

  return {
    fmSqlLang: new LanguageSupport(mixedFmSqlLanguage, [
      flt().support,
      sqlLang.support,
    ]),
    sqlLang,
  };
};
