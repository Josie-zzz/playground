import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags as t } from "@lezer/highlight";

import { fltLanguage } from "../../languages/freemarker/register";

// 默认样式 -- 不指定scope，全局生效
const defaultHighlightStyle = HighlightStyle.define([
  { tag: t.comment, color: "#9995b7", fontStyle: "italic" },
  { tag: [t.keyword], color: "#3865E9" },
  { tag: [t.string, t.regexp], color: "#34BA7B" },
  { tag: [t.number, t.bool, t.null], color: "#FAB426" },
  { tag: t.standard(t.name), color: "#D95C4E" },
  {
    tag: [t.operator, t.compareOperator, t.arithmeticOperator, t.logicOperator],
    color: "#FF8F71",
  },
  { tag: [t.paren, t.bracket, t.squareBracket, t.brace], color: "#333333" },
  {
    tag: [t.function(t.variableName), t.function(t.name)],
    color: "#2a55e5",
  },
  { tag: [t.tagName, t.annotation], color: "#a533ff" },
  { tag: [t.className, t.typeName], color: "#fa5089" },
  { tag: [t.variableName, t.propertyName], color: "#ff6347" },
]);

// 针对语言特殊设置的样式 -- 主要是因为可以语言混合，需要颜色区分
const fltHighlightStyle = HighlightStyle.define(
  [
    { tag: [t.comment, t.angleBracket, t.special(t.brace)], color: "#9995b7" },
    { tag: t.keyword, color: "#FA5089", fontWeight: "bold" },
    { tag: [t.number, t.bool, t.null], color: "#FAB426" },
    {
      tag: [t.definition(t.propertyName), t.function(t.variableName)],
      color: "#D95C4E",
    },
    { tag: [t.propertyName, t.variableName], color: "#0095a8" },
    { tag: t.operator, color: "#FF8F71", fontWeight: "bold" },
    { tag: [t.string, t.regexp], color: "#34BA7B" },
  ],
  { scope: fltLanguage },
);

// 好像插件靠前，颜色优先级越高，官网没有说。。。
export default [fltHighlightStyle, defaultHighlightStyle].map((style) =>
  syntaxHighlighting(style),
);
