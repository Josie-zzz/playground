import {
  type Completion,
  type CompletionContext,
  type CompletionResult,
  type CompletionSource,
  snippetCompletion,
} from "@codemirror/autocomplete";
import {
  blockDirectiveNames,
  leafDirectiveNames,
} from "@/freemarker";

import {
  CompletionBoost,
  CompletionType,
  SqlCompletionConfig,
  SqlFunction,
} from "../../types";

const fmBlockDirectives = blockDirectiveNames;
const fmLeafDirectives = leafDirectiveNames;

// 指令片段
const fmSnippets: Completion[] = [
  snippetCompletion("<#if ${condition}>\n  ${}\n</#if>", {
    label: "<#if>...</#if>",
    type: CompletionType.directive,
    detail: "片段：条件指令",
    boost: CompletionBoost.highest,
  }),
  snippetCompletion(
    "<#list ${list} as ${item}>\n  <#if ${item_index} > 0>${}</#if>\n</#list>",
    {
      label: "<#list>...</#list>",
      type: CompletionType.directive,
      detail: "片段：循环指令",
      boost: CompletionBoost.highest,
    },
  ),
  snippetCompletion("<#macro ${name} ${params}>\n  ${}\n</#macro>", {
    label: "<#macro>...</#macro>",
    type: CompletionType.directive,
    detail: "片段：宏定义",
    boost: CompletionBoost.highest,
  }),
  snippetCompletion("<#assign ${name} = ${value}>", {
    label: "<#assign>",
    type: CompletionType.directive,
    detail: "片段：变量赋值",
    boost: CompletionBoost.highest,
  }),
  snippetCompletion("<#include '${path}'>", {
    label: "<#include>",
    type: CompletionType.directive,
    detail: "片段：包含模板",
    boost: CompletionBoost.highest,
  }),
  snippetCompletion("<#import '${path}' as ${ns}>", {
    label: "<#import>",
    type: CompletionType.directive,
    detail: "片段：导入模板",
    boost: CompletionBoost.highest,
  }),
  snippetCompletion("<#-- ${} -->", {
    label: "<#-- -->",
    type: CompletionType.comment,
    detail: "片段：注释",
    boost: CompletionBoost.highest,
  }),
];

const fmParseOpenDirectiveStack = (text: string) => {
  const stack: string[] = [];

  const reg = /<\/#([A-Za-z_][\w-]*)\b|<#([A-Za-z_][\w-]*)\b/g;
  let match: RegExpExecArray | null;
  while ((match = reg.exec(text))) {
    const closeName = match[1];
    const openName = match[2];

    if (openName && fmBlockDirectives.has(openName)) {
      stack.push(openName);
      continue;
    }
    if (closeName && fmBlockDirectives.has(closeName)) {
      for (let i = stack.length - 1; i >= 0; i--) {
        if (stack[i] === closeName) {
          stack.splice(i, 1);
          break;
        }
      }
    }
  }

  return stack;
};

const fmParseMacroDefinitions = (text: string) => {
  const reg = /<#macro\s+([A-Za-z_][\w.]*)\b/g;
  const names = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = reg.exec(text))) {
    if (match[1]) {
      names.add(match[1]);
    }
  }
  return [...names];
};

const fmCompletionTriggerReg = /(<#--|<\/#|<#|<\/@|<@|\$\{|\?)[\w.-]*$/;

// 指令补全source
export const fmDirectiveCompletionSource: CompletionSource = (
  context: CompletionContext,
): CompletionResult | null => {
  const before = context.matchBefore(fmCompletionTriggerReg);
  if (!before) {
    return null;
  }

  const { text } = before;

  if (text.startsWith("</#")) {
    const docBefore = context.state.sliceDoc(0, context.pos);
    const stack = fmParseOpenDirectiveStack(docBefore);
    const candidates = [
      ...new Set([...stack].reverse().concat([...fmBlockDirectives])),
    ];

    return {
      from: before.from,
      to: before.to,
      options: candidates.map((name) => ({
        label: `</#${name}>`,
        apply: `</#${name}>`,
        type: CompletionType.directive,
        detail: "单指令：闭合标签",
        boost: CompletionBoost.lowest,
      })),
      validFor: /[\w-]+/,
    };
  }

  if (text.startsWith("<#")) {
    const candidates = [...fmBlockDirectives, ...fmLeafDirectives];
    const options: Completion[] = [
      ...fmSnippets,
      ...candidates.map((name) => ({
        label: `<#${name}>`,
        apply: `<#${name}>`,
        type: CompletionType.directive,
        detail: "单指令：指令",
        boost: CompletionBoost.lowest,
      })),
    ];
    return {
      from: before.from,
      to: before.to,
      options,
      validFor: /[\w-]+/,
    };
  }

  if (text.startsWith("</@")) {
    const docBefore = context.state.sliceDoc(0, context.pos);
    const macros = fmParseMacroDefinitions(docBefore);
    const candidates = macros.length ? macros : ["macro"];
    return {
      from: before.from,
      to: before.to,
      options: candidates.map((name) => ({
        label: `</@${name}>`,
        apply: `</@${name}>`,
        type: "keyword",
        detail: "单指令：闭合宏",
        boost: CompletionBoost.lowest,
      })),
      validFor: /[\w.-]+/,
    };
  }

  if (text.startsWith("<@")) {
    const docBefore = context.state.sliceDoc(0, context.pos);
    const macros = fmParseMacroDefinitions(docBefore);
    const options: Completion[] = macros.map((name) => ({
      label: `<@${name}>`,
      apply: `<@${name}>`,
      type: CompletionType.variable,
      detail: "单指令：宏调用",
      boost: CompletionBoost.lowest,
    }));
    if (options.length) {
      return {
        from: before.from,
        to: before.to,
        options,
        validFor: /[\w.-]+/,
      };
    }
  }

  return null;
};

// 函数补全
export const fmFunctionCompletionSource: (
  config: SqlCompletionConfig["func"],
) => CompletionSource = (config) => {
  const funcOptions: SqlFunction[] = config || [];
  return (context: CompletionContext): CompletionResult | null => {
    const before = context.matchBefore(fmCompletionTriggerReg);
    if (!before) {
      return null;
    }

    const { text } = before;

    if (text.startsWith("?")) {
      const options = funcOptions.map((val) => ({
        label: val.label ?? val.key,
        apply: val.key,
        // 区分类型，设置icon的
        type: CompletionType.function,
        detail: "单指令：内置函数",
        boost: val.boost ?? CompletionBoost.lowest,
      }));

      return {
        from: before.from + 1,
        to: before.to,
        options,
        validFor: /[\w_]+/,
      };
    }

    return null;
  };
};
