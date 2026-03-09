export interface Range {
  from: number;
  to: number;
}

export interface TemplateRanges {
  /**
   * “需要保留原文”的区间列表：
   * - lint：这些区间会原样拷贝回输出（其余位置用空格/占位保持长度）
   * - format：这些区间会保持为 SQL 原文，保证 SQL formatter 能正确格式化 SQL 片段
   */
  keepRanges: Range[];
  /**
   * FreeMarker 插值区间列表（例如 `${...}`）：
   * - lint：会被替换为等长的 placeholder，避免 SQL parser 误报/错位
   * - format：会被替换为可恢复的 token（如 `__CM_FM_VAR_0__`），格式化后再还原
   */
  interpolationRanges: Range[];
}

const getCursorName = (cursor: unknown): string => {
  const anyCursor = cursor as { name?: string; type?: { name?: string } };
  return anyCursor.name ?? anyCursor.type?.name ?? "";
};

/**
 * 合并重叠/相邻区间，并按 from 升序输出
 * 因为freemarker会拆分多个Text/TextContent区间，所以需要合并
 */
const mergeRanges = (ranges: Range[]) => {
  const sorted = ranges
    .filter((r) => r.to > r.from)
    .slice()
    .sort((a, b) => a.from - b.from);

  const merged: Range[] = [];
  for (const r of sorted) {
    const last = merged[merged.length - 1];
    if (!last || r.from > last.to) {
      merged.push({ from: r.from, to: r.to });
      continue;
    }
    last.to = Math.max(last.to, r.to);
  }
  return merged;
};

/**
 * 从 lezer/codemirror 的 cursor 中提取关键区间：
 * - Text / TextContent：视为 SQL 原文，需要保留
 * - Interpolation：视为变量插值，需要占位
 *
 * 注意：这里故意不做“父节点过滤”，调用方只要给到合适的 cursor（如 freemarker parser / mixed parser）
 * 就能拿到想要的 Text/Interpolation 区间。
 */
export const collectTemplateRangesFromCursor = (
  cursor: unknown,
): TemplateRanges => {
  const keepRanges: Range[] = [];
  const interpolationRanges: Range[] = [];

  const treeCursor = cursor as {
    from: number;
    to: number;
    name?: string;
    type?: { name?: string };
    firstChild: () => boolean;
    nextSibling: () => boolean;
    parent: () => boolean;
  };

  // 迭代遍历整棵树：firstChild -> nextSibling -> parent 回溯
  let done = false;
  while (!done) {
    const name = getCursorName(treeCursor);
    const from = treeCursor.from;
    const to = treeCursor.to;

    if (to > from) {
      if (name === "Text" || name === "TextContent") {
        keepRanges.push({ from, to });
      } else if (name === "Interpolation") {
        interpolationRanges.push({ from, to });
      }
    }

    // 深度优先遍历：优先进入子节点
    if (treeCursor.firstChild()) {
      continue;
    }

    let moved = false;
    while (!moved) {
      // 没有子节点，就开始 向右找兄弟节点
      if (treeCursor.nextSibling()) {
        moved = true;
        continue;
      }
      if (!treeCursor.parent()) {
        done = true;
        moved = true;
        continue;
      }
    }
  }
  return {
    keepRanges: mergeRanges(keepRanges),
    interpolationRanges: mergeRanges(interpolationRanges),
  };
};

/**
 * lint 模式的“填充字符”规则：
 * - 保留换行（保证行号对齐）
 * - 其他字符统一用空格（保证长度对齐）
 */
const preserveNewlinesOrSpace = (original: string) => {
  if (original === "\n" || original === "\r") {
    return original;
  }
  return " ";
};

const findPrevNonSpaceChar = (text: string, pos: number) => {
  for (let i = pos - 1; i >= 0; i--) {
    const ch = text[i];
    if (!/\s/.test(ch)) {
      return ch;
    }
  }
  return null;
};

const findNextNonSpaceChar = (text: string, pos: number) => {
  for (let i = pos; i < text.length; i++) {
    const ch = text[i];
    if (!/\s/.test(ch)) {
      return ch;
    }
  }
  return null;
};

const findPrevNonSpaceCharFromArray = (text: string[], pos: number) => {
  for (let i = pos - 1; i >= 0; i--) {
    const ch = text[i];
    if (!/\s/.test(ch)) {
      return ch;
    }
  }
  return null;
};

const findNextNonSpaceCharFromArray = (text: string[], pos: number) => {
  for (let i = pos; i < text.length; i++) {
    const ch = text[i];
    if (!/\s/.test(ch)) {
      return ch;
    }
  }
  return null;
};

const isIdentChar = (ch: string | null) =>
  ch !== null && /[A-Za-z0-9_]/.test(ch);

/**
 * 根据插值两侧的上下文，选择一个对 SQL parser 更友好的占位符：
 * - ' ${...} '：返回空串（避免字符串内容被人为填充导致解析更混乱）
 * - 点号/标识符附近：返回 "x"（更像列名/函数名的一部分）
 * - 其他场景：返回 "1"（更像数值）
 *
 * 关键目标：减少 SQL parser 的误报，并且不影响后续错误定位的字符 offset。
 */
const pickInterpolationPlaceholder = (
  text: string,
  from: number,
  to: number,
) => {
  const prev = findPrevNonSpaceChar(text, from);
  const next = findNextNonSpaceChar(text, to);

  if (prev === "'" && next === "'") {
    return "";
  }

  if (prev === "." || isIdentChar(prev) || isIdentChar(next)) {
    return "x";
  }

  return "1";
};

/**
 * 将插值区间替换成“等宽占位符”：
 * - 区间长度必须保持不变（lint 的红线定位依赖 from/to）
 * - 换行必须保留（行号对齐）
 *
 * 例：`${userId}` 所在区间可能被写成 `1       ` 或 `x       `（长度与原区间一致）
 */
const writePlaceholderFixedWidth = (
  out: string[],
  originalText: string,
  from: number,
  to: number,
  placeholder: string,
) => {
  const safeFrom = Math.max(0, from);
  const safeTo = Math.min(originalText.length, to);
  let k = 0;
  for (let i = safeFrom; i < safeTo; i++) {
    const original = originalText[i];
    if (original === "\n" || original === "\r") {
      out[i] = original;
      continue;
    }
    out[i] = k < placeholder.length ? placeholder[k] : " ";
    k += 1;
  }
};

/**
 * 修正孤立逗号，降低 SQL parser 在“拼接后的 SQL 文本”上的误判：
 * - 如 `SELECT , a` / `SELECT ( , )` 这类会因为占位/替换更容易出现
 * - 把不合法位置的 `,` 变成空格，让 SQL parser 更稳定
 */
const normalizeDanglingCommas = (out: string[]) => {
  for (let i = 0; i < out.length; i++) {
    if (out[i] !== ",") {
      continue;
    }
    const prev = findPrevNonSpaceCharFromArray(out, i);
    const next = findNextNonSpaceCharFromArray(out, i + 1);
    const shouldDrop =
      prev === null ||
      next === null ||
      prev === "(" ||
      prev === "," ||
      next === ")" ||
      next === ",";
    if (shouldDrop) {
      out[i] = " ";
    }
  }
};

/**
 * 生成 lint 用的 SQL 文本：
 * 1) 先初始化 out：与原文等长，非换行全是空格
 * 2) 把 keepRanges 的原文拷贝回 out（这就是“SQL正文”）
 * 3) 把 interpolationRanges 替换成等宽 placeholder（避免 parser 报错乱飞）
 * 4) 进行逗号清理，减少误报
 *
 * 返回值：
 * - 与原 docText 等长
 * - 行号、字符 offset 与原文保持一致（这是 lint 定位稳定的关键）
 */
export const buildLintSqlText = (docText: string, ranges: TemplateRanges) => {
  const out: string[] = new Array(docText.length);
  for (let i = 0; i < docText.length; i += 1) {
    out[i] = preserveNewlinesOrSpace(docText[i]);
  }

  for (const r of ranges.keepRanges) {
    for (let i = r.from; i < r.to && i < docText.length; i += 1) {
      out[i] = docText[i]!;
    }
  }

  for (const r of ranges.interpolationRanges) {
    const placeholder = pickInterpolationPlaceholder(docText, r.from, r.to);
    writePlaceholderFixedWidth(out, docText, r.from, r.to, placeholder);
  }

  normalizeDanglingCommas(out);

  return out.join("");
};

export type FmTokenMap = Map<string, string>;

/**
 * 生成 format 用的 masked 文本：
 * - keepRanges：原样保留（SQL formatter 只需要看到 SQL 正文）
 * - interpolationRanges：用变量 token 替换（例如 `__CM_FM_VAR_0__`）
 * - 其余区间：用注释 token 替换（例如 `/* __CM_FM_0__ * /`）
 * - tokenToValue 用于 format 完成后再把 token 恢复回原 freemarker 片段。
 */
export const maskForFormat = (docText: string, ranges: TemplateRanges) => {
  const tokenToValue: FmTokenMap = new Map();
  const keepRanges = mergeRanges(ranges.keepRanges);
  const interpolations = mergeRanges(ranges.interpolationRanges);
  if (!keepRanges.length && !interpolations.length) {
    return { masked: docText, tokenToValue };
  }

  let tokenIndex = 0;
  let varTokenIndex = 0;
  const out: string[] = [];

  // 注释占位符
  const pushCommentToken = (from: number, to: number) => {
    if (to <= from) {
      return;
    }
    const token = `__CM_FM_${tokenIndex++}__`;
    tokenToValue.set(token, docText.slice(from, to));
    out.push(`/* ${token} */`);
  };

  // 变量占位符
  const pushVarToken = (from: number, to: number) => {
    if (to <= from) {
      return;
    }
    const token = `__CM_FM_VAR_${varTokenIndex++}__`;
    tokenToValue.set(token, docText.slice(from, to));
    out.push(token);
  };

  const segments = [
    ...keepRanges.map((r) => ({ ...r, type: "keep" as const })),
    ...interpolations.map((r) => ({ ...r, type: "var" as const })),
  ].sort((a, b) => {
    if (a.from !== b.from) {
      return a.from - b.from;
    }
    if (a.to !== b.to) {
      return a.to - b.to;
    }
    return a.type === b.type ? 0 : a.type === "keep" ? -1 : 1;
  });

  let pos = 0;
  for (const seg of segments) {
    // 如果pos小于seg.from，说明有间隔，需要用注释占位符填充
    if (pos < seg.from) {
      pushCommentToken(pos, seg.from);
      pos = seg.from;
    }

    // 如果在这个范围内，说明是正文或者插值
    if (seg.from <= pos && pos < seg.to) {
      if (seg.type === "keep") {
        out.push(docText.slice(pos, seg.to));
      } else {
        pushVarToken(pos, seg.to);
      }
      pos = seg.to;
    }
  }

  // 如果还有剩余字符，用注释占位符填充
  if (pos < docText.length) {
    pushCommentToken(pos, docText.length);
  }

  return { masked: out.join(""), tokenToValue };
};

/**
 * 将 format 阶段生成的 token 恢复成原始 freemarker 片段：
 * - 注释 token：`/* __CM_FM_0__ * /` -> 原文片段
 * - 变量 token：`__CM_FM_VAR_0__` -> 原文 `${...}`
 */
export const unmaskFormat = (text: string, tokenToValue: FmTokenMap) => {
  const restoredComments = text.replace(
    /\/\*\s*__CM_FM_(\d+)__\s*\*\//g,
    (match, num) => tokenToValue.get(`__CM_FM_${num}__`) ?? match,
  );
  return restoredComments.replace(
    /__CM_FM_VAR_(\d+)__/g,
    (match, num) => tokenToValue.get(`__CM_FM_VAR_${num}__`) ?? match,
  );
};
