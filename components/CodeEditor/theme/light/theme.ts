import { EditorView } from "@codemirror/view";

const angleIconUrl = "/codeEditor/angle.svg";
const bolangIconUrl = "/codeEditor/bolang.svg";
const snippetIconUrl = "/codeEditor/code.svg";
const commentIconUrl = "/codeEditor/comment.svg";
const datasetIconUrl = "/codeEditor/dataset.svg";
const downIconUrl = "/codeEditor/down.svg";
const functionIconUrl = "/codeEditor/fx.svg";
const keywordIconUrl = "/codeEditor/keyword.svg";
const typeIconUrl = "/codeEditor/type.svg";
const variableIconUrl = "/codeEditor/variable.svg";

const theme = EditorView.theme({
  "&.cm-editor": {
    backgroundColor: "#F4F4F5",
    color: "#323335",
    fontSize: "12px",
  },
  ".cm-content": { padding: "12px", "padding-left": 0 },
  ".cm-sql-function": { color: "#d9782d" },
  ".cm-gutter-lint": {
    width: "12px",
  },

  /* 选中文本的样式 */
  ".cm-selectionBackground": {
    background: "rgba(42, 85, 229, 0.25)",
  },
  "&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground": {
    background: "rgba(42, 85, 229, 0.25)",
  },
  "&.cm-focused .cm-content ::selection": {
    backgroundColor: "rgba(42, 85, 229, 0.25)",
  },

  ".cm-foldGutter-marker": {
    width: "14px",
    height: "14px",
    display: "inline-block",
    cursor: "pointer",
    backgroundImage: `url("${downIconUrl}")`,
    backgroundRepeat: "no-repeat",
    backgroundPosition: "center",
    backgroundSize: "contain",

    "&.cm-foldGutter-marker-closed": {
      transform: "rotate(-90deg)",
      transformOrigin: "center",
    },
  },

  ".cm-tooltip": {
    border: "none",
    borderRadius: "4px",
    background: "#FFF",
    boxShadow: "0 8px 24px 0 rgba(0, 0, 0, 0.08)",
    zIndex: 2000,
  },
  ".cm-tooltip.cm-tooltip-below:not(.cm-tooltip-autocomplete)": {
    transform: "translateY(4px)",
  },
  ".cm-tooltip.cm-tooltip-above:not(.cm-tooltip-autocomplete)": {
    transform: "translateY(-4px)",
  },

  // lint弹层样式
  ".cm-diagnostic": {
    borderRadius: "4px",
    padding: "8px 12px",
    borderLeft: "4px solid #F31857",
    lineHeight: "12px",
  },
  ".cm-diagnosticText": {
    color: "#323335",
    display: "block",
    marginBottom: "6px",
    fontSize: "12px",
  },

  ".cm-diagnosticSource": {
    color: "#969AA0",
    fontSize: "12px",
  },
  // lint 错误图标样式
  ".cm-lint-marker-error": {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    flexShrink: 0,
    backgroundColor: "#E34949",
    content: "''",
  },
  ".cm-lint-marker-error, .cm-lintPoint-error, .cm-lintRange-error": {
    cursor: "pointer",
  },
  ".cm-lintPoint:after": {
    content: `url("${angleIconUrl}")`,
    border: "none",
    width: "7px",
    height: "6px",
    left: "-3.5px",
    bottom: "2px",
  },
  ".cm-lintRange-error": {
    backgroundImage: "none",
    position: "relative",
  },
  ".cm-lintRange-error:after": {
    position: "absolute",
    width: "100%",
    height: "6px",
    bottom: "-4px",
    content: "''",
    left: "0px",
    backgroundImage: `url("${bolangIconUrl}")`,
    backgroundRepeat: "repeat-x",
    backgroundPosition: "left bottom",
  },

  // 自动补全弹层样式
  ".cm-tooltip.cm-tooltip-autocomplete > ul > li": {
    padding: "6px 12px",
    display: "flex",
    alignItems: "center",
    lineHeight: "14px",
  },
  ".cm-tooltip.cm-tooltip-autocomplete > ul": {
    "max-height": "200px",
  },
  '.cm-tooltip-autocomplete ul li[aria-selected="true"]': {
    backgroundColor: "#F4F4F5",
    color: "inherit",
  },
  ".cm-completionIcon": {
    width: "12px",
    height: "12px",
    paddingRight: "6px",
    flexShrink: 0,
    display: "inline-block",
    backgroundRepeat: "no-repeat",
    backgroundPosition: "center",
    backgroundSize: "contain",
  },
  ".cm-completionMatchedText": {
    textDecoration: "none",
    color: "#2A55E5",
  },
  ".cm-completionIcon:after": {
    content: "''",
  },
  ".cm-completionIcon-keyword": {
    backgroundImage: `url("${keywordIconUrl}")`,
  },
  ".cm-completionIcon-type": {
    backgroundImage: `url("${typeIconUrl}")`,
  },
  ".cm-completionIcon-function": {
    backgroundImage: `url("${functionIconUrl}")`,
  },
  ".cm-completionIcon-variable": {
    backgroundImage: `url("${variableIconUrl}")`,
  },
  ".cm-completionIcon-comment": {
    backgroundImage: `url("${commentIconUrl}")`,
  },
  ".cm-completionIcon-dataset": {
    backgroundImage: `url("${datasetIconUrl}")`,
  },
  ".cm-completionIcon-snippet": {
    backgroundImage: `url("${snippetIconUrl}")`,
  },
  ".cm-placeholder": {
    color: "#c1c1c1",
  },
});

export default theme;
