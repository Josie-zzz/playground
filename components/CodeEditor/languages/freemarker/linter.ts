import { syntaxTree } from "@codemirror/language";
import { Diagnostic, linter } from "@codemirror/lint";
import { Text } from "@codemirror/state";
import { SyntaxNode, TreeCursor } from '@lezer/common'

// 找到开始节点和结束节点的标识名
const findBlockDirectiveName = (doc: Text, node: SyntaxNode): string | null => {
  const findNode = (node: TreeCursor): string | null => {
    // 错误节点可能还会走进来
    if(node.type.isError) {
      return null;
    }
    if (node.name === "BlockDirectiveName") {
      return doc.sliceString(node.from, node.to);
    }
    let hasNode = node.firstChild();
    if (hasNode) {
      return findNode(node);
    }
    hasNode = node.nextSibling();
    if (hasNode) {
      return findNode(node);
    }
    hasNode = node.parent();
    if (hasNode) {
      return findNode(node);
    }
    return null;
  };
  return findNode(node.cursor());
};

// 找到标签开始节点
const findSiblingBlockDirectiveHead = (endNode: any) => {
  const cursor = endNode.cursor();
  while (cursor.prevSibling()) {
    if (cursor.name === "BlockDirectiveHead") {
      return cursor.node;
    }
  }
  return null;
};

/** 检查闭合标签是否匹配 */
const checkBlockDirectiveMatch = (doc: Text, node: SyntaxNode) => {
  const nodeName = node.name ?? node.type.name;
  if (nodeName === "BlockDirectiveEnd") {
    const endName = findBlockDirectiveName(doc, node.node);
    const headNode = findSiblingBlockDirectiveHead(node.node);
    const headName = headNode ? findBlockDirectiveName(doc, headNode) : null;
    if (endName && headName && endName !== headName) {
      return {
        from: node.from,
        to: node.to,
        severity: "error",
        message: `闭合标签不匹配：开始是 <#${headName}>，但结束是 </#${endName}>`,
        source: "freemarker-linter",
      };
    }
  }
  return null;
};

export const fltLinter = linter((view) => {
  const diagnostics: Diagnostic[] = [];
  const doc = view.state.doc;
  syntaxTree(view.state)
    .cursor()
    .iterate((node) => {
      if (node.type.isError) {
        diagnostics.push({
          from: node.from,
          to: node.to,
          severity: "error",
          message: "Syntax error",
          source: "freemarker-linter",
        });
      } else {
        const checkName = checkBlockDirectiveMatch(doc, node.node);
        if (checkName) {
          diagnostics.push(checkName as Diagnostic);
        }
      }
    });
    console.log(diagnostics);
  return diagnostics;
});
