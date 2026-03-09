import { Diagnostic } from "@codemirror/lint";
import type { Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";

export type SqlLanguageId = "sql" | "hive-sql" | "ck-sql" | "doris-sql";

/** 不支持外界传递配置 */
type FmLangType = "fm-sql";

export type EditorLanguageId =
  | SqlLanguageId
  | FmLangType
  | "json"
  | "expression"
  | "freemarker";

export type EditorThemeMode = "light" | "dark";

export interface SqlLanguageOptions {
  /** 补全配置 */
  completion?: SqlCompletionConfig;
  /** 是否使用 FreeMarker 语法 */
  useFreeMarker?: boolean;
  /** 自定义 linter，用于如果有后端固定接口的实时校验场景。如果是手动触发可以封装编辑器的setDiagnostics */
  linter?: (s: string, view: EditorView) => Diagnostic[] | Promise<Diagnostic[]>;
}

export interface EditorLanguageConfig {
  id: EditorLanguageId;
  label: string;
  placeholder?: string;
  extensions: Extension[];
  formatText?: (text: string) => string;
}

export interface SqlFunction {
  key: string;
  label?: string;
  detail?: string;
  boost?: CompletionBoost;
}

export interface SqlVariableOption<TDetail = unknown> {
  key: string;
  label?: string;
  detail?: TDetail;
  boost?: CompletionBoost;
}

export interface SqlVariableRule<TDetail = unknown> {
  startTag: string;
  endTag: string;
  trigger?: string;
  hover?: boolean;
  /** 自定义变量块是否可以编辑，默认是true，设置为false后，变量块内的内容不会被编辑，光标会跳过，删除也会整个删除 */
  allowEdit?: boolean;
  /** 自定义变量块的高亮样式 */
  noMerge?: boolean;
  highlightStyle?: {
    /** 变量块的分隔符 */
    separator?: string,
    /** 变量块的内容样式，如果没有分隔符就设置一个，如果有分隔符就设置多个 */
    contentStyle?: React.CSSProperties[],
    /** 变量块的分隔符样式 */
    separatorStyle?: React.CSSProperties,
    /** 开闭tag的样式 */
    tagStyle?: React.CSSProperties,
  };
  hoverRender?: (detail: TDetail) => string;
  options: SqlVariableOption<TDetail>[];
}

export interface SqlCompletionConfig {
  /** 函数补全 */
  func?: SqlFunction[];
  /** 变量补全 */
  variable?: SqlVariableRule[];
}

export interface ICodeEditorProps {
  /** 语言 */
  language: EditorLanguageId;
  /** 语言配置，传递给特殊语言的配置，如 sql 语言的 schema */
  languageConfig?: SqlLanguageOptions;
  /** 默认值 */
  defaultValue?: string;
  /** 编辑器内容 */
  value?: string;
  /** 内容改变回调 */
  onChange?: (value: string) => void;
  /** 编辑器类名 */
  className?: string;
  /** 编辑器高度 */
  height?: string;
  /** 编辑器占位符 */
  placeholder?: string;
  /** 是否显示工具栏 */
  showToolbar?: boolean;
  /** 是否启用格式化 */
  enableFormat?: boolean;
  /** 是否禁用编辑器 */
  disabled?: boolean;
}

export enum CompletionType {
  keyword = "keyword",
  function = "function",
  comment = "comment",
  // 先用keyword 的样式，后期再改
  directive = "keyword",
  variable = "variable",
}

/** 补全项优先级 */
export enum CompletionBoost {
  lowest = 1,
  low = 2,
  medium = 3,
  high = 4,
  highest = 5,
}
