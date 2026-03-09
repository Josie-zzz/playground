import { CompletionBoost, SqlCompletionConfig } from "../../types";

const funcOptions = [
  "length",
  "size",
  "keys",
  "values",
  "first",
  "last",
  "seq_contains",
  "seq_index_of",
  "seq_last_index_of",
  "chunk",
  "join",
  "reverse",
  "sort",
  "sort_by",
  "starts_with",
  "ends_with",
  "contains",
  "index_of",
  "last_index_of",
  "split",
  "trim",
  "replace",
  "upper_case",
  "lower_case",
  "cap_first",
  "uncap_first",
  "capitalize",
  "date",
  "time",
  "datetime",
  "string",
  "number",
  "boolean",
  "url",
  "html",
  "xml",
  "js_string",
  "json_string",
] as const;

export const completion: SqlCompletionConfig = {
  // 函数
  func: funcOptions.map((name) => ({
    key: name,
    label: name,
    detail: "内置函数",
  })),
  // 变量
  variable: [
    {
      // 变量的表达式，匹配模版变量进行染色
      startTag: "${",
      endTag: "}",
      // 触发条件
      trigger: "$",
      highlightStyle: { contentStyle: [{ fontWeight: "bold" }] },
      options: [
        {
          key: "${Vars.}",
          label: "自定义过滤变量",
          boost: CompletionBoost.high,
        },
        { key: "${Extra.x}", label: "其他变量" },
        { key: "${DSL.Indicators}", label: "select字段" },
        { key: "${DSL.GroupBy}", label: "分组字段" },
        { key: "${GroupBy}", label: "分组字段" },
        { key: "${DSL.OrderBy}", label: "排序字段" },
        { key: "${DSL.Offset}", label: "偏移量" },
        { key: "${DSL.Limit}", label: "分页大小" },
        { key: "${GroupBy}", label: "分组字段" },
        { key: "${OrderBy}", label: "排序字段" },
        { key: "${Limit}", label: "分页大小" },
        { key: "${PageSize}", label: "分页大小" },
        { key: "${Offset}", label: "偏移量" },
        { key: "${PageNum}", label: "分页页码" },
        { key: "${WhereString}", label: "过滤字段" },
      ],
    },
  ],
} satisfies SqlCompletionConfig;
