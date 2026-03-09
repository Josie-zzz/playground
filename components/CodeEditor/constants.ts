interface FormatOptions {
  indentSize: number;
  keywordCase: "upper" | "lower";
}

// 默认的格式化配置
export const defaultFormatOptions: FormatOptions = {
  indentSize: 4,
  keywordCase: "upper",
};
