import { parser } from "@/freemarker";
import type { TreeCursor } from "@lezer/common";

import { defaultFormatOptions } from "../../constants";

/** 格式化配置（对外入参） */
export interface IFormatTextOptions {
  /** 缩进宽度 */
  indentSize?: number;
  /** 是否保留文本行首缩进（默认 false），比如在保留sql的缩进 */
  preserveTextIndent?: boolean;
}

/** 空格标记 */
interface SpaceMark {
  leftSpace: boolean;
  rightSpace: boolean;
}

/** 节点标记 */
interface NodeMark {
  indent: number;
  preIndent: number;
  preserveTextIndent: boolean;
  space: SpaceMark;
}

/** FreeMarker 语法树节点（从 Lezer TreeCursor 递归构建的轻量结构） */
interface AstNode {
  name: string;
  from: number;
  to: number;
  parent: AstNode | null;
  children: AstNode[];
  mark: NodeMark;
}

/** 空格单位（本实现里固定为 1 个半角空格） */
const spaceUnit = " ";

/** 需要在其左侧禁止插入空格的 token 类型 */
const noLeftSpaceTokenNames = new Set<string>([
  "GreaterThan",
  "InterpolationEnd",
]);

/** 将 Lezer 的 TreeCursor 递归转换为可遍历的 AST 结构（并挂载 parent 指针） */
const buildAst = (
  cursor: TreeCursor,
  parent: AstNode | null,
  input: string,
  indentSize: number,
  preserveTextIndent?: boolean,
): AstNode => {
  const lineStart = input.lastIndexOf("\n", cursor.from - 1) + 1;
  const linePrefix = input.slice(lineStart, cursor.from);
  const isLineStart = linePrefix.trim() === "";
  const preIndent =
    isLineStart && preserveTextIndent
      ? linePrefix.length - linePrefix.trimStart().length
      : 0;

  /** 当前节点对象 */
  const node: AstNode = {
    name: cursor.name,
    from: cursor.from,
    to: cursor.to,
    parent,
    children: [],
    mark: {
      indent: 0,
      preIndent,
      preserveTextIndent: Boolean(preserveTextIndent),
      space: { leftSpace: false, rightSpace: false },
    },
  };

  if (cursor.firstChild()) {
    do {
      node.children.push(
        buildAst(cursor, node, input, indentSize, preserveTextIndent),
      );
    } while (cursor.nextSibling());
    cursor.parent();
  }

  return node;
};

/** 判断是否是“文本流节点”：Text/TextContent/Interpolation 会参与同一段文本重排 */
const isTextFlowNode = (name: string) =>
  name === "Text" || name === "TextContent" || name === "Interpolation";

/** 判断节点是否需要缩进，目前指令包裹的需要缩进 */
const isIndentBodyNode = (node: AstNode) => {
  if (node.name === "DirectiveBody" && node.parent?.name === "BlockDirective") {
    return true;
  }
  if (node.name === "MacroBody" && node.parent?.name === "MacroBlock") {
    return true;
  }
  return false;
};

const isElseOrElseIfDirective = (input: string, node: AstNode) => {
  if (node.name !== "LeafDirective") {
    return false;
  }
  const stack: AstNode[] = [node];
  while (stack.length) {
    const cur = stack.pop()!;
    if (
      cur.name === "LeafDirectiveName" &&
      cur.parent?.name === "LeafDirectiveStart"
    ) {
      const name = input.slice(cur.from, cur.to).trim().toLowerCase();
      return name === "else" || name === "elseif";
    }
    for (let i = cur.children.length - 1; i >= 0; i -= 1) {
      stack.push(cur.children[i]!);
    }
  }
  return false;
};

const markIndent = (node: AstNode, input: string) => {
  // 指令内部需要缩进的，统一增加 1 层
  if (isIndentBodyNode(node)) {
    node.mark.indent = 1;
  }
  // else/elseif 指令内部需要缩进的，统一减少 1 层
  if (isElseOrElseIfDirective(input, node)) {
    node.mark.indent = -1;
  }
  // 设置preIndent，没有则继承父节点的 preIndent
  node.mark.preIndent = node.mark.preIndent
    ? node.mark.preIndent
    : node.parent?.mark.preIndent || 0;
  for (const child of node.children) {
    markIndent(child, input);
  }
};

/** 判断是否是“可忽略的空白节点” */
const isIgnorableWhitespaceNode = (node: AstNode) => node.name === "Space";

/** 判断是否是指令名 token（用于给指令名后的参数留一个空格） */
const isDirectiveNameToken = (node: AstNode) => {
  if (
    node.name === "BlockDirectiveName" &&
    node.parent?.name === "BlockDirectiveStart"
  ) {
    return true;
  }
  if (
    (node.name === "LeafDirectiveName" ||
      node.name === "UnknownDirectiveName") &&
    node.parent?.name === "LeafDirectiveStart"
  ) {
    return true;
  }
  if (node.name === "Variable" && node.parent?.name === "MacroDirectiveStart") {
    return true;
  }
  return false;
};

/** 判断是否是操作符 token */
const isOperatorToken = (node: AstNode) => {
  if (node.name === "UnaryOpToken") {
    return true;
  }
  if (
    node.name === "BinaryOpToken" ||
    node.name === "AngleOpToken" ||
    node.name === "BuiltInQuestion" ||
    node.name === "TernaryQuestion" ||
    node.name === "TernaryColon"
  ) {
    return true;
  }
  if (node.parent?.name === "BinaryOp" || node.parent?.name === "UnaryOp") {
    return true;
  }
  return false;
};

/** 基于规则为“叶子 token 节点”打空格标记 */
const markSpaceForLeaf = (node: AstNode) => {
  const { space } = node.mark;
  space.leftSpace = false;
  space.rightSpace = false;

  // 处理注释内容
  if (node.name === "CommentContent") {
    space.leftSpace = true;
    space.rightSpace = true;
    return;
  }

  if (node.name === "CommentStart") {
    space.rightSpace = true;
    return;
  }

  if (node.name === "CommentEnd") {
    space.leftSpace = true;
    return;
  }

  // 标签指令后面需要一个空格
  if (isDirectiveNameToken(node)) {
    space.rightSpace = true;
    return;
  }

  if (isOperatorToken(node)) {
    if (node.name === "BuiltInQuestion") {
      return;
    }
    if (node.name === "UnaryOpToken") {
      return;
    }
    space.leftSpace = true;
    space.rightSpace = true;
  }

  if (node.name === "SelfClose") {
    space.leftSpace = true;
    return;
  }
};

/** 收集子树下按出现顺序排列的叶子 token（忽略 Space） */
const collectLeafTokens = (node: AstNode, out: AstNode[] = []) => {
  if (!node.children.length) {
    if (!isIgnorableWhitespaceNode(node) && node.to > node.from) {
      out.push(node);
    }
    return out;
  }
  for (const child of node.children) {
    collectLeafTokens(child, out);
  }
  return out;
};

/** 自上而下给整棵树打空格标记（只在叶子节点上生效） */
const markSpace = (node: AstNode) => {
  if (!node.children.length) {
    if (!isIgnorableWhitespaceNode(node)) {
      markSpaceForLeaf(node);
    }
    return;
  }
  for (const child of node.children) {
    markSpace(child);
  }
  // 如果有多个指令参数，每个参数之间需要一个空格
  // 例子：<@common.greet a b c>
  if (node.name === "DirectiveArg") {
    const parent = node.parent;
    if (parent) {
      const index = parent.children.indexOf(node);
      let hasNextDirectiveArg = false;
      for (let i = index + 1; i < parent.children.length; i += 1) {
        const sib = parent.children[i];
        if (isIgnorableWhitespaceNode(sib)) {
          continue;
        }
        hasNextDirectiveArg = sib.name === "DirectiveArg";
        break;
      }
      if (hasNextDirectiveArg) {
        // 给当前指令参数的最后一个 token 右侧添加空格
        const tokens = collectLeafTokens(node);
        const last = tokens[tokens.length - 1];
        if (last) {
          last.mark.space.rightSpace = true;
        }
      }
    }
  }
};

/** 格式化一个“行内节点”（指令/插值/注释等），只做空格规范化 */
const formatInlineNode = (input: string, node: AstNode) => {
  /** 当前节点下的所有叶子 token */
  const tokens = collectLeafTokens(node);
  if (!tokens.length) {
    return "";
  }

  /** 取 token 文本（必要时做轻量归一化） */
  const getTokenText = (t: AstNode) => {
    const raw = input.slice(t.from, t.to);
    if (t.name === "CommentContent") {
      return raw.trim();
    }
    return raw;
  };

  /** 判断是否必须在两 token 之间插入空格 */
  const needsSpaceBetween = (prev: AstNode, next: AstNode) => {
    if (
      noLeftSpaceTokenNames.has(next.name) &&
      prev.name !== "CommentContent"
    ) {
      return false;
    }
    return prev.mark.space.rightSpace || next.mark.space.leftSpace;
  };

  /** 输出 token 串 */
  /** 需要进行“括号紧贴”，() / [] / {} 的内侧不要空格 */
  const tightBracketContextNodeNames = new Set<string>([
    "ParenExpression",
    "SequenceLiteral",
    "HashLiteral",
    "BracketAccess",
  ]);
  /** 需要进行“, : 只右侧一个空格”处理的结构节点类型 */
  const commaColonContextNodeNames = new Set<string>([
    "SequenceLiteral",
    "HashLiteral",
  ]);
  interface NodeRange {
    from: number;
    to: number;
  }
  const collectRanges = (
    n: AstNode,
    names: Set<string>,
    out: NodeRange[] = [],
  ) => {
    if (names.has(n.name)) {
      out.push({ from: n.from, to: n.to });
    }
    for (const child of n.children) {
      collectRanges(child, names, out);
    }
    return out;
  };
  const overlapsAny = (ranges: NodeRange[], from: number, to: number) => {
    for (const r of ranges) {
      if (from < r.to && to > r.from) {
        return true;
      }
    }
    return false;
  };
  // 找到这些节点的范围
  const tightBracketRanges = collectRanges(node, tightBracketContextNodeNames);
  const commaColonRanges = collectRanges(node, commaColonContextNodeNames);
  const bracketAccessRanges = collectRanges(
    node,
    new Set<string>(["BracketAccess"]),
  );
  const normalizeSegment = (segment: string, from: number, to: number) => {
    // 把各种空白压成单个空格
    let out = segment.replace(/[ \t\r\n\f]+/g, spaceUnit);
    if (out.trim() === "") {
      return out;
    }
    const inTightBracket = overlapsAny(tightBracketRanges, from, to);
    const inCommaColon = overlapsAny(commaColonRanges, from, to);
    const inBracketAccess = overlapsAny(bracketAccessRanges, from, to);
    if (inBracketAccess) {
      out = out.replace(/^\s+\[/g, "[");
      out = out.replace(/(\w|["'`\]\)])\s+\[/g, "$1[");
    }
    if (inTightBracket) {
      out = out.replace(/([\{\[\(])\s+/g, "$1");
      out = out.replace(/\s+([\}\]\)])/g, "$1");
    }
    if (inCommaColon) {
      out = out.replace(/\s+([,:])/g, "$1");
      out = out.replace(/([,:])\s*/g, "$1 ");
      out = out.replace(/([,:])\s+([\}\]\)])/g, "$1$2");
    }
    return out;
  };

  let out = "";
  const first = tokens[0]!;
  out += normalizeSegment(
    input.slice(node.from, first.from),
    node.from,
    first.from,
  );
  out += getTokenText(first);

  for (let i = 1; i < tokens.length; i += 1) {
    const prev = tokens[i - 1]!;
    const next = tokens[i]!;
    const rawGap = input.slice(prev.to, next.from);
    const normalizedGap = normalizeSegment(rawGap, prev.to, next.from);
    const canInsertLeadingSpace =
      needsSpaceBetween(prev, next) &&
      !overlapsAny(bracketAccessRanges, prev.to, next.from) &&
      !/^\s/.test(normalizedGap) &&
      /^[\[\{\(]/.test(normalizedGap);
    if (canInsertLeadingSpace && !out.endsWith(spaceUnit)) {
      out += spaceUnit;
    }
    const finalGap = noLeftSpaceTokenNames.has(next.name)
      ? normalizedGap.replace(/[ ]+$/g, "")
      : normalizedGap;
    if (finalGap.trim() === "") {
      out += needsSpaceBetween(prev, next) ? spaceUnit : "";
    } else {
      out += finalGap;
    }
    out += getTokenText(next);
  }

  const tail = input.slice(tokens[tokens.length - 1]!.to, node.to);
  out += normalizeSegment(tail, tokens[tokens.length - 1]!.to, node.to);

  return out.trim();
};

/** 重建一段“文本区域”的缩进（保留相对缩进，但对齐到当前层级缩进） */
const reindentTextRegion = (text: string, indentPrefix: string) => {
  /** 按行拆分的文本 */
  const lines = text.split("\n").map((line) => line.replace(/[ \t]+$/g, ""));
  /** 计算最小公共缩进（用于保留相对缩进） */
  let commonIndent = Number.POSITIVE_INFINITY;
  for (const line of lines) {
    if (line.trim() === "") {
      continue;
    }
    const indentLen = line.match(/^\s*/)?.[0]?.length ?? 0;
    commonIndent = Math.min(commonIndent, indentLen);
  }
  if (!Number.isFinite(commonIndent)) {
    commonIndent = 0;
  }

  /** 重新输出 */
  const outLines: string[] = [];
  for (const line of lines) {
    if (line.trim() === "") {
      continue;
    }
    const sliced = commonIndent > 0 ? line.slice(commonIndent) : line;
    outLines.push(`${indentPrefix}${sliced}`);
  }
  return outLines;
};

/** 将一组节点输出为“文本流”（Text/TextContent/Interpolation）并做缩进重建 */
const emitTextFlow = (
  input: string,
  nodes: AstNode[],
  indentLevel: number,
  indentSize: number,
  outLines: string[],
) => {
  const preserveTextIndent = nodes[0]?.mark.preserveTextIndent ?? false;
  const preIndentWidth = nodes[0]?.mark.preIndent || 0;
  const finalIndentWidth = Math.max(
    0,
    indentLevel * indentSize + preIndentWidth,
  );
  /** 当前层级缩进前缀 */
  const indentPrefix = spaceUnit.repeat(finalIndentWidth);
  /** 拼接区域原文：Text 直接取原文，Interpolation 取行内格式化结果 */
  const raw = nodes
    .map((n) =>
      n.name === "Interpolation"
        ? formatInlineNode(input, n)
        : input.slice(n.from, n.to),
    )
    .join("");
  const stripIndentWidth = (line: string, maxWidth: number) => {
    let i = 0;
    while (i < maxWidth && line[i] === spaceUnit) {
      i += 1;
    }
    return line.slice(i);
  };

  if (preserveTextIndent) {
    const baseWidth = preIndentWidth;
    const regionLines = raw
      .split("\n")
      .map((line) => line.replace(/[ \t]+$/g, ""));
    for (const line of regionLines) {
      if (line.trim() === "") {
        continue;
      }
      outLines.push(`${indentPrefix}${stripIndentWidth(line, baseWidth)}`);
    }
  } else {
    const regionLines = reindentTextRegion(raw, indentPrefix);
    for (const line of regionLines) {
      if (line.trim() === "") {
        continue;
      }
      outLines.push(line);
    }
  }
};

/** 输出一个“行内指令/注释/宏标签”等节点为单独一行 */
const emitInlineLine = (
  input: string,
  node: AstNode,
  indentLevel: number,
  indentSize: number,
  outLines: string[],
) => {
  const preIndentWidth = node.mark.preIndent || 0;
  const finalIndentWidth = Math.max(
    0,
    indentLevel * indentSize + preIndentWidth,
  );
  /** 当前层级缩进前缀 */
  const indentPrefix = spaceUnit.repeat(finalIndentWidth);
  const line = formatInlineNode(input, node);
  if (!line) {
    return;
  }
  outLines.push(`${indentPrefix}${line}`);
};

/** 找到某个节点的第一个子节点 */
const findChild = (node: AstNode, name: string) =>
  node.children.find((n) => n.name === name);

const emitBlockDirective = (
  input: string,
  node: AstNode,
  indentLevel: number,
  indentSize: number,
  outLines: string[],
) => {
  const head = findChild(node, "BlockDirectiveHead");
  const body = findChild(node, "DirectiveBody");
  const end = findChild(node, "BlockDirectiveEnd");

  if (head) {
    emitInlineLine(input, head, indentLevel, indentSize, outLines);
  }

  if (body) {
    emitFlow(
      input,
      body.children,
      indentLevel + body.mark.indent,
      indentSize,
      outLines,
    );
  }

  if (end) {
    emitInlineLine(input, end, indentLevel, indentSize, outLines);
  }
};

const emitMacroBlock = (
  input: string,
  node: AstNode,
  indentLevel: number,
  indentSize: number,
  outLines: string[],
) => {
  const head = findChild(node, "MacroBlockHead");
  const body = findChild(node, "MacroBody");
  const end = findChild(node, "MacroEnd");

  if (head) {
    emitInlineLine(input, head, indentLevel, indentSize, outLines);
  }

  if (body) {
    emitFlow(
      input,
      body.children,
      indentLevel + body.mark.indent,
      indentSize,
      outLines,
    );
  }

  if (end) {
    emitInlineLine(input, end, indentLevel, indentSize, outLines);
  }
};

/** 按节点列表自上而下遍历并输出格式化后的行 */
const emitFlow = (
  input: string,
  nodes: AstNode[],
  indentLevel: number,
  indentSize: number,
  outLines: string[],
) => {
  let index = 0;
  while (index < nodes.length) {
    const node = nodes[index]!;

    // 文本节点
    if (isTextFlowNode(node.name)) {
      const start = index;
      let end = index + 1;
      while (end < nodes.length && isTextFlowNode(nodes[end]!.name)) {
        end += 1;
      }
      emitTextFlow(
        input,
        nodes.slice(start, end),
        indentLevel,
        indentSize,
        outLines,
      );
      index = end;
      continue;
    }

    if (node.name === "Directive") {
      const inner = node.children[0];
      if (inner?.name === "BlockDirective") {
        emitBlockDirective(input, inner, indentLevel, indentSize, outLines);
        index += 1;
        continue;
      }
      if (inner) {
        emitInlineLine(
          input,
          inner,
          Math.max(0, indentLevel + inner.mark.indent),
          indentSize,
          outLines,
        );
      }
      index += 1;
      continue;
    }

    if (node.name === "MacroBlock") {
      emitMacroBlock(input, node, indentLevel, indentSize, outLines);
      index += 1;
      continue;
    }

    if (node.name === "MacroDirective") {
      emitInlineLine(
        input,
        node,
        Math.max(0, indentLevel + node.mark.indent),
        indentSize,
        outLines,
      );
      index += 1;
      continue;
    }

    if (node.name === "Comment") {
      emitInlineLine(
        input,
        node,
        Math.max(0, indentLevel + node.mark.indent),
        indentSize,
        outLines,
      );
      index += 1;
      continue;
    }

    if (node.children.length) {
      emitFlow(input, node.children, indentLevel, indentSize, outLines);
      index += 1;
      continue;
    }

    index += 1;
  }
};

/** 创建 FreeMarker 文本格式化函数（基于语法树标记 + 重新输出） */
export const createFltFormatText = (options?: IFormatTextOptions) => {
  /** 缩进单位：每层缩进的空格数 */
  const indentSize = options?.indentSize ?? defaultFormatOptions.indentSize;
  const preserveTextIndent = options?.preserveTextIndent ?? false;

  return (text: string) => {
    try {
      // 解析成语法树
      const tree = parser.parse(text);
      const ast = buildAst(
        tree.cursor(),
        null,
        text,
        indentSize,
        preserveTextIndent,
      );

      // 打标记
      markIndent(ast, text);
      markSpace(ast);

      // 格式化开始工作
      const lines: string[] = [];
      if (ast.name === "Document") {
        emitFlow(text, ast.children, 0, indentSize, lines);
      } else {
        emitFlow(text, [ast], 0, indentSize, lines);
      }

      const output = lines
        .filter((line) => line.trim() !== "")
        .join("\n")
        .replace(/[ \t]+$/gm, "")
        .trimEnd();
      return text.endsWith("\n") ? `${output}\n` : output;
    } catch {
      return text;
    }
  };
};
