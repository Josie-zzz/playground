import { acceptCompletion, completionStatus } from "@codemirror/autocomplete";
import { Prec } from "@codemirror/state";
import { type Command, keymap } from "@codemirror/view";

const acceptCompletionIfActive: Command = (view) => {
  // 如果面板没有被激活，不执行任何操作
  if (completionStatus(view.state) !== "active") {
    return false;
  }
  return acceptCompletion(view);
};

// 自动补全相关的按键绑定
export const completionAcceptKeymap = Prec.highest(
  keymap.of([
    { key: "Tab", run: acceptCompletionIfActive },
    { key: "Enter", run: acceptCompletionIfActive },
  ]),
);

export const getAcceptKeymap = () => [completionAcceptKeymap];
