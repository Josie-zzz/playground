import { styleTags, tags as t } from '@lezer/highlight';

/** 定义语法树节点和高亮标签的映射关系 */
export const fmHighlighting = styleTags({
  'Text/...': t.content,
  'Comment/...': t.blockComment,
  'InterpolationStart InterpolationEnd': t.special(t.brace),
  'StartTag EndTag MacroStartTag MacroEndTag GreaterThan SelfClose': t.angleBracket,
  'BlockDirectiveName LeafDirectiveName': t.keyword,
  'BlockDirectiveStart LeafDirectiveStart BlockDirectiveEndHead ElseStart ElseIfStart': t.keyword,
  "as in eq ne gt lt gte lte and or not": t.operator,
  'BinaryOp UnaryOp PostfixOp BinaryOpToken AngleOpToken UnaryOpToken BuiltInQuestion TernaryQuestion TernaryColon DefaultValueStart': t.operator,
  StringLiteral: t.string,
  NumberLiteral: t.number,
  'BooleanLiteral/...': t.bool,
  'NullLiteral/...': t.null,
  'BuiltInArgs': t.annotation,
  BuiltInArgsStart: t.paren,
  Variable: t.variableName,
  'BuiltInName/Variable': t.function(t.variableName),
  '( )': t.paren,
  '[ ]': t.squareBracket,
  '{ }': t.brace,
  ', : = Dot': t.punctuation,
});
