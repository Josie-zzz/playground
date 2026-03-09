/** 从 Lezer LR 包中引入外部 tokenizer 能力 */
import { ExternalTokenizer } from "@lezer/lr";
import {
  BlockDirectiveName,
  LeafDirectiveName,
  AngleOpToken,
  TernaryQuestion,
  BuiltInArgsStart,
  DefaultValueStart,
  GreaterThan,
  LessThan,
} from "./parser.terms";

/**
 * 本文件里的 `ch` 一般表示“字符码”（Unicode code point 的数值）
 * - 例如：`>` 是 62，`<` 是 60，`=` 是 61，`!` 是 33
 * - 为了避免“魔法数字”，下面把常用字符码都起了名字
 */

/** 'A' 的字符码 */
const CH_A = 65;
/** 'Z' 的字符码 */
const CH_Z = 90;
/** '_' 的字符码 */
const CH_UNDERSCORE = 95;
/** 'a' 的字符码 */
const CH_a = 97;
/** 'z' 的字符码 */
const CH_z = 122;
/** 161 以上的字符码（扩展字符） */
const CH_EXTENDED_START = 161;

/** '0' 的字符码 */
const CH_0 = 48;
/** '9' 的字符码 */
const CH_9 = 57;
/** '-' 的字符码 */
const CH_HYPHEN = 45;
/** '.' 的字符码 */
const CH_DOT = 46;
/** ':' 的字符码 */
const CH_COLON = 58;

/** 空格的字符码 */
const CH_SPACE = 32;
/** Tab 的字符码 */
const CH_TAB = 9;
/** 换行（LF, \\n）的字符码 */
const CH_LF = 10;
/** 回车（CR, \\r）的字符码 */
const CH_CR = 13;

/** 双引号（"）的字符码 */
const CH_DQUOTE = 34;
/** 单引号（'）的字符码 */
const CH_SQUOTE = 39;
/** 左括号（(）的字符码 */
const CH_LPAREN = 40;
/** 右括号（)）的字符码 */
const CH_RPAREN = 41;
/** 左方括号（[）的字符码 */
const CH_LBRACKET = 91;
/** 右方括号（]）的字符码 */
const CH_RBRACKET = 93;
/** 左花括号（{）的字符码 */
const CH_LBRACE = 123;
/** 右花括号（}）的字符码 */
const CH_RBRACE = 125;

/** 感叹号（!）的字符码 */
const CH_BANG = 33;
/** 小于号（<）的字符码 */
const CH_LT = 60;
/** 大于号（>）的字符码 */
const CH_GT = 62;
/** 等号（=）的字符码 */
const CH_EQUAL = 61;

/** 井号（#）的字符码 */
const CH_HASH = 35;
/** 斜杠（/）的字符码 */
const CH_SLASH = 47;
/** at 符号（@）的字符码 */
const CH_AT = 64;
/** 问号（?）的字符码 */
const CH_QMARK = 63;

/** 指令名（directive name）首字符允许出现的字符判断 */
function nameStartChar(ch: number): boolean {
  return (
    (ch >= CH_A && ch <= CH_Z) ||
    ch === CH_UNDERSCORE ||
    (ch >= CH_a && ch <= CH_z) ||
    ch >= CH_EXTENDED_START
  );
}

/** 指令名（directive name）后续字符允许出现的字符判断 */
function namePartChar(ch: number): boolean {
  return (
    nameStartChar(ch) ||
    (ch >= CH_0 && ch <= CH_9) ||
    ch === CH_HYPHEN ||
    ch === CH_DOT ||
    ch === CH_COLON
  );
}

/** 判断当前字符是否为空白字符（空格/制表/换行/回车） */
function isSpace(ch: number): boolean {
  return ch === CH_SPACE || ch === CH_TAB || ch === CH_LF || ch === CH_CR;
}

/**
 * 从 startOffset 开始向前看，找到第一个非空白字符的相对偏移
 * - 返回 -1 表示已到文件结尾
 */
function nextNonSpaceOffset(input: { peek: (offset: number) => number }, startOffset: number): number {
  for (let offset = startOffset; ; offset++) {
    /** 当前向前看的字符码（< 0 表示 EOF） */
    const ch = input.peek(offset);
    if (ch < 0) return -1;
    if (!isSpace(ch)) return offset;
  }
}

/**
 * 判断一个字符是否像“表达式项”的起始字符
 * - 用于在 tokenizer 阶段做轻量启发式判断，避免把标签闭合符号误当成运算符
 */
function isExpressionTermStart(ch: number): boolean {
  return (
    ch === CH_DQUOTE ||
    ch === CH_SQUOTE ||
    ch === CH_LPAREN ||
    ch === CH_LBRACKET ||
    ch === CH_LBRACE ||
    ch === CH_BANG ||
    (ch >= CH_0 && ch <= CH_9) ||
    (ch >= CH_A && ch <= CH_Z) ||
    ch === CH_UNDERSCORE ||
    (ch >= CH_a && ch <= CH_z)
  );
}

/** 需要闭合的指令名集合（例如：<#if>...</#if>） */
export const blockDirectiveNames = new Set([
  "if",
  "list",
  "macro",
  "function",
  "switch",
  "compress",
  "attempt",
]);

/** 叶子指令名集合（例如：<#assign ...>、<#break>） */
export const leafDirectiveNames = new Set([
  "else",
  "elseif",
  "assign",
  "global",
  "local",
  "import",
  "include",
  "case",
  "default",
  "break",
  "continue",
  "return",
  "stop",
  "recover",
  "sep",
  "recurse",
  "fallback",
  "visit",
  "t",
  "lt",
  "rt",
  "nt",
  "flush",
  'nested',
]);

/**
 * 识别 `<#` 或 `</#` 之后紧跟的指令名，并产出对应的关键词 token
 * 如果在枚举范围里，就产出对应的关键词 token
 * - 例如：`<#if` => If，`<#elseif` => ElseIf
 */
export const directiveName = new ExternalTokenizer(input => {
  /** 收集到的指令名 */
  let name = "";
  /** 当前要检查的字符 */
  let next = input.next;

  if (!nameStartChar(next)) return;
  while (namePartChar(next)) {
    name += String.fromCharCode(next);
    input.advance();
    next = input.next;
  }
  if (!name) return;
  /** 指令名的小写形式（用于不区分大小写的匹配） */
  const lower = name.toLowerCase();
  if (blockDirectiveNames.has(lower)) {
    input.acceptToken(BlockDirectiveName);
    return;
  }
  if (leafDirectiveNames.has(lower)) {
    input.acceptToken(LeafDirectiveName);
    return;
  }
});

/**
 * 处理 `>` / `<` 的冲突：
 * - `>`：可能是表达式运算符（a > b），也可能是指令标签闭合（<#if ... >）
 * - `<`：可能是表达式运算符（a < b），也可能是文本里的 `<` 或标签开始 `<#`
 *
 * 核心策略（结合语法栈）：
 * - 仅在“语法上同时允许闭合和运算符”的位置（canClose && canOp）才做消歧
 * - 对 `>` 使用“空格规则”消歧：
 *   - 如果 `>` 左右两边都紧挨空白（如：`a > b`），才把它当作运算符
 *   - 如果 `>` 左边紧挨着表达式项（如：`b>`），更倾向把它当作标签闭合
 */
export const angleTokens = new ExternalTokenizer(
  (input, stack) => {
    /** 当前输入流的下一个字符 */
    const next = input.next;

    if (next === CH_GT) {
      // `>=` 交给 grammar 内部的 BinaryOpToken 处理，这里不抢
      if (input.peek(1) === CH_EQUAL) return;

      /** `>` 左侧紧挨着的字符（不存在则为 -1） */
      const before = input.peek(-1);
      /** `>` 右侧紧挨着的字符（不存在则为 -1） */
      const after1 = input.peek(1);
      /** `>` 左右是否都紧挨着空白（符合“运算符两边必须有空格”的写法） */
      const hasSpaceAround = isSpace(before) && isSpace(after1);
      /** `>` 右侧第一个非空白字符的偏移 */
      const afterOffset = nextNonSpaceOffset(input, 1);
      /** `>` 右侧第一个非空白字符（若不存在则为 -1） */
      const after = afterOffset < 0 ? -1 : input.peek(afterOffset);
      /** 当前语法状态是否允许把 `>` 当作“标签闭合” */
      const canClose = stack.canShift(GreaterThan);
      /** 当前语法状态是否允许把 `>` 当作“二元运算符” */
      const canOp = stack.canShift(AngleOpToken);

      if (canClose && canOp) {
        // 同时允许 “> 作为标签闭合” 和 “> 作为运算符” 时，只能用启发式规则消歧
        if (hasSpaceAround && isExpressionTermStart(after)) {
          input.advance();
          input.acceptToken(AngleOpToken);
          return;
        }
        if (stack.canShift(GreaterThan)) {
          input.advance();
          input.acceptToken(GreaterThan);
        }
        return;
      } else if (canOp && isExpressionTermStart(after)) {
        // 非二义性场景：语法上只允许运算符（或至少闭合不成立），直接当运算符
        input.advance();
        input.acceptToken(AngleOpToken);
        return;
      }

      if (stack.canShift(GreaterThan)) {
        // 兜底：当作标签闭合
        input.advance();
        input.acceptToken(GreaterThan);
      }
      return;
    }

    if (next === CH_LT) {
      // `<#` / `</#` 属于标签起始，交给 grammar 内部 token 处理
      if (input.peek(1) === CH_HASH) return;
      if (input.peek(1) === CH_SLASH && input.peek(2) === CH_HASH) return;
      // `<@` / `</@` 属于宏调用标签起始，交给 grammar 内部 token 处理
      if (input.peek(1) === CH_AT) return;
      if (input.peek(1) === CH_SLASH && input.peek(2) === CH_AT) return;
      /** 当前语法状态是否允许把 `<` 当作“普通文本里的小于号” */
      const canTextLt = stack.canShift(LessThan);
      /** 当前语法状态是否允许把 `<` 当作“二元运算符” */
      const canOp = stack.canShift(AngleOpToken);
      if (input.peek(1) === CH_EQUAL) {
        // `<=` 会由 grammar 内部的 BinaryOpToken 处理，这里只兜底单个 `<` 的场景
        if (canTextLt && !canOp) {
          input.advance();
          input.acceptToken(LessThan);
        }
        return;
      }

      /** `<` 右侧第一个非空白字符的偏移 */
      const afterOffset = nextNonSpaceOffset(input, 1);
      /** `<` 右侧第一个非空白字符（若不存在则为 -1） */
      const after = afterOffset < 0 ? -1 : input.peek(afterOffset);
      if (isExpressionTermStart(after) && canOp) {
        // 语法上允许二元运算符且右侧像表达式项起始 → 把 `<` 当运算符
        input.advance();
        input.acceptToken(AngleOpToken);
        return;
      }

      if (canTextLt) {
        // 否则作为文本 `<`（避免破坏普通文本的解析）
        input.advance();
        input.acceptToken(LessThan);
      }
    }
  },
  { contextual: true },
);

/**
 * 核心是识别出来这个 ? 到底是不是三元的 ?，避免和内建 `a?size` / `a?string(...)` 冲突
 * 关键策略：
 * - 只在语法栈明确允许 TernaryQuestion 的位置才尝试匹配
 * - 从 `?` 往后扫描，必须在“同一层级（不跨括号/方括号/花括号）”找到 `:` 才认为这是三元
 * - 如果先遇到插值结束 `}`、自闭合 `/>` 或指令闭合 `>`（且不是运算符 `a > b`）则直接放弃
 */
export const ternaryQuestion = new ExternalTokenizer(
  (input, stack) => {
    /** 只处理 `?`，以及允许 TernaryQuestion 时才会产出 */
    if (input.next !== CH_QMARK) return;
    if (!stack.canShift(TernaryQuestion)) return;

    /** ( ) 的嵌套 */
    let parenDepth = 0;
    /** [ ] 的嵌套 */
    let bracketDepth = 0;
    /** { } 的嵌套 */
    let braceDepth = 0;

    for (let offset = 1; ; offset++) {
      const ch = input.peek(offset);
      if (ch < 0) return;

      if (ch === CH_DQUOTE || ch === CH_SQUOTE) {
        // 跳过字符串的所有内容，避免把字符串里的 ':' 误判为三元分支分隔符
        const quote = ch;
        for (offset = offset + 1; ; offset++) {
          const inner = input.peek(offset);
          if (inner < 0) return;
          if (inner === quote) break;
        }
        continue;
      }

      if (ch === CH_LPAREN) {
        parenDepth++;
        continue;
      }
      if (ch === CH_RPAREN) {
        if (parenDepth > 0) {
          parenDepth--;
          continue;
        }
      }
      if (ch === CH_LBRACKET) {
        bracketDepth++;
        continue;
      }
      if (ch === CH_RBRACKET) {
        if (bracketDepth > 0) {
          bracketDepth--;
          continue;
        }
      }
      if (ch === CH_LBRACE) {
        braceDepth++;
        continue;
      }
      if (ch === CH_RBRACE) {
        if (braceDepth > 0) {
          braceDepth--;
          continue;
        }
      }

      /** 只在顶层扫描 `:`，避免把子表达式里的 ':' 当成三元分隔符 */
      const atTopLevel = parenDepth === 0 && bracketDepth === 0 && braceDepth === 0;
      if (!atTopLevel) continue;

      if (ch === CH_COLON) {
        // 能在顶层找到 ':'，则确认当前 '?' 为三元问号
        input.advance();
        input.acceptToken(TernaryQuestion);
        return;
      }

      // 插值结束（${ ... }）的 '}'：说明在插值内已经走到末尾了，放弃把 '?' 当三元
      if (ch === CH_RBRACE) return;

      // 进入指令自闭合：说明在标签范围内提前结束，放弃把 '?' 当三元
      if (ch === CH_SLASH && input.peek(offset + 1) === CH_GT) return;

      if (ch === CH_GT) {
        // 进入指令闭合：在标签属性里也会遇到 '>'，此时需要避免把 '?' 误判为三元
        // 如果这个 '>' 更像运算符（a > b），则继续扫描；否则认为标签闭合，直接放弃
        if (input.peek(offset + 1) === CH_EQUAL) continue;
        const prevChar = input.peek(offset - 1);
        const nextChar = input.peek(offset + 1);
        // 是不是类似表达式左右都有空格的写法：a > b
        const hasSpaceAround = isSpace(prevChar) && isSpace(nextChar);
        const nextNonSpaceCharOffset = nextNonSpaceOffset(input, offset + 1);
        const nextNonSpaceChar = nextNonSpaceCharOffset < 0 ? -1 : input.peek(nextNonSpaceCharOffset);
        if (hasSpaceAround && isExpressionTermStart(nextNonSpaceChar)) continue;
        return;
      }
    }
  },
  { contextual: true },
);

/** 识别出函数调用的起始 `(`（只在 BuiltInCall 语法位置产出） */
export const builtInArgsStart = new ExternalTokenizer(
  (input, stack) => {
    if (input.next !== CH_LPAREN) return;
    if (!stack.canShift(BuiltInArgsStart)) return;
    input.advance();
    input.acceptToken(BuiltInArgsStart);
  },
  { contextual: true },
);

/**
 * 判断默认值token
 * 因为 ! 在 FreeMarker 里至少有三种身份：
 * 默认值： a!0 / a!"fallback" 
 * 一元取反： !a
 * 普通文本字符：模板正文里随便出现的 !
 */
export const defaultValueStart = new ExternalTokenizer(
  (input, stack) => {
    // 判断下一个字符是不是！
    if (input.next !== CH_BANG) return;
    // 判断当前语法栈是否允许 DefaultValueStart这个 token。【例如在普通文本中解析到的，因为普通文本里不能有默认值运算符，所以就可以直接跳过】
    if (!stack.canShift(DefaultValueStart)) return;
    // peek：查看前一个字符
    const before = input.peek(-1);
    // 默认值必须紧挨：a!0 / a!"x"（不允许 a !0，也不允许 a! 0）
    if (isSpace(before)) return;
    // 查看后一个字符
    const after = input.peek(1);
    if (after === CH_EQUAL) return;
    if (isSpace(after)) return;
    // 将流向前推进一个字符
    input.advance();
    // 把刚刚在 ExternalTokenizer 里“识别出来并消耗掉”的那段输入，作为一个具体的 token。
    input.acceptToken(DefaultValueStart);
  },
  { contextual: true },
);
