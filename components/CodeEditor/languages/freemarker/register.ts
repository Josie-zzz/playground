import {
  LRLanguage,
  LanguageSupport,
  TreeIndentContext,
  foldInside,
  foldNodeProp,
  indentNodeProp,
} from "@codemirror/language";
import { fmHighlighting, parser } from "@/freemarker";

const fltBlockIndent = (context: TreeIndentContext) => {  
  if (context.pos === 0) {
    return context.baseIndent;
  }

  const prevLineText = context.lineAt(context.pos, -1).text;
  const prevIndent = context.lineIndent(context.pos, -1);
  const prevTrimmed = prevLineText.trimStart();

  // 只有标签后面回车才缩进
  if (/^<#/.test(prevTrimmed)) {
    return prevIndent + context.unit;
  }

  return prevIndent;
};

// 语言定义
export const fltLanguage = LRLanguage.define({
  name: "freemarker",
  parser: parser.configure({
    props: [
      fmHighlighting,
      // 代码折叠
      foldNodeProp.add({
        BlockDirective: foldInside,
        MacroBlock: foldInside,
        Comment: foldInside,
        Interpolation: foldInside,
        ParenExpression: foldInside,
        SequenceLiteral: foldInside,
        HashLiteral: foldInside,
      }),
      // 缩进
      indentNodeProp.add({
        // 针对整个文档节点内生效
        Document: fltBlockIndent,
      }),
    ],
  }),
  languageData: {
    // 让编辑器可以通过快捷键注释
    commentTokens: { block: { open: "<#--", close: "-->" } },
  },
});

// 语言包注册
export const flt = () => new LanguageSupport(fltLanguage);
