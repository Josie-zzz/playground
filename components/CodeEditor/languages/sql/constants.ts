import { SQLDialect } from "@codemirror/lang-sql";

import {
  SqlCompletionConfig,
  SqlFunction,
  SqlLanguageId,
  SqlVariableRule,
} from "../../types";
import { ClickHouseSQL, DorisSQL, HiveSQL, StandardSQL } from "./register";

interface SqlLanguageConfig {
  label: string;
  placeholder?: string;
  dialect: (funcRules?: SqlFunction[]) => SQLDialect;
  completion?: SqlCompletionConfig;
}

// 公共函数（所有引擎均支持）
const CommonFunc = [
  {
    key: "SUM",
    label: "SUM",
    detail: "求和：SUM(col)",
  },
  {
    key: "AVG",
    label: "AVG",
    detail: "求平均值：AVG(col)",
  },
  {
    key: "COUNT",
    label: "COUNT",
    detail: "统计行数：COUNT(*)（所有行）/COUNT(col)（非NULL值）",
  },
  {
    key: "MAX",
    label: "MAX",
    detail: "求最大值：MAX(col)",
  },
  {
    key: "MIN",
    label: "MIN",
    detail: "求最小值：MIN(col)",
  },
  {
    key: "ABS",
    label: "ABS",
    detail: "取绝对值：ABS(num)",
  },
  {
    key: "ROUND",
    label: "ROUND",
    detail: "四舍五入：ROUND(num, decimals)（decimals默认0）",
  },
  {
    key: "CEIL",
    label: "CEIL",
    detail: "向上取整：CEIL(num)",
  },
  {
    key: "FLOOR",
    label: "FLOOR",
    detail: "向下取整：FLOOR(num)",
  },
  {
    key: "MOD",
    label: "MOD",
    detail: "取模（余数）：MOD(num1, num2)",
  },
  {
    key: "POWER",
    label: "POWER",
    detail: "幂运算：POWER(num, n)（num的n次方）",
  },
  {
    key: "CONCAT",
    label: "CONCAT",
    detail: "拼接字符串：CONCAT(str1, str2, ...)",
  },
  {
    key: "UPPER",
    label: "UPPER",
    detail: "转换字符串为大写：UPPER(str)",
  },
  {
    key: "LOWER",
    label: "LOWER",
    detail: "转换字符串为小写：LOWER(str)",
  },
  {
    key: "TRIM",
    label: "TRIM",
    detail:
      "去除字符串首尾指定字符（默认空格）：TRIM([BOTH/LEADING/TRAILING] char FROM str)",
  },
  {
    key: "REPLACE",
    label: "REPLACE",
    detail: "替换字符串内容：REPLACE(str, old, new)",
  },
  {
    key: "SUBSTRING",
    label: "SUBSTRING",
    detail: "截取子串：SUBSTRING(str, start, length)（start从1开始）",
  },
  {
    key: "LOCATE",
    label: "LOCATE",
    detail: "查找子串位置（找不到返回0）：LOCATE(substr, str)",
  },
  {
    key: "NOW",
    label: "NOW",
    detail: "获取当前日期和时间：NOW()",
  },
  {
    key: "CURRENT_TIMESTAMP",
    label: "CURRENT_TIMESTAMP",
    detail: "获取当前日期和时间：CURRENT_TIMESTAMP()",
  },
  {
    key: "YEAR",
    label: "YEAR",
    detail: "提取日期中的年份：YEAR(date)",
  },
  {
    key: "MONTH",
    label: "MONTH",
    detail: "提取日期中的月份：MONTH(date)",
  },
  {
    key: "DAY",
    label: "DAY",
    detail: "提取日期中的日期：DAY(date)",
  },
  {
    key: "HOUR",
    label: "HOUR",
    detail: "提取时间中的小时：HOUR(datetime)",
  },
  {
    key: "MINUTE",
    label: "MINUTE",
    detail: "提取时间中的分钟：MINUTE(datetime)",
  },
  {
    key: "SECOND",
    label: "SECOND",
    detail: "提取时间中的秒数：SECOND(datetime)",
  },
  {
    key: "COALESCE",
    label: "COALESCE",
    detail: "返回第一个非NULL值：COALESCE(val1, val2, ...)",
  },
  {
    key: "NULLIF",
    label: "NULLIF",
    detail: "两值相等返回NULL，否则返回第一个值：NULLIF(val1, val2)",
  },
  {
    key: "IF",
    label: "IF",
    detail: "简单条件判断：IF(condition, val_true, val_false)",
  },
];

// 标准SQL独有函数
const StandardSQLFunc = [
  {
    key: "TO_CHAR",
    label: "TO_CHAR",
    detail: "日期/数值格式化：TO_CHAR(date/num, format)",
  },
  {
    key: "POSITION",
    label: "POSITION",
    detail: "查找子串位置：POSITION(substr IN str)",
  },
  {
    key: "DATEADD",
    label: "DATEADD",
    detail: "日期加减：DATEADD(unit, num, date)（unit：YEAR/MONTH/DAY等）",
  },
  {
    key: "DATEDIFF",
    label: "DATEDIFF",
    detail: "计算日期差值：DATEDIFF(unit, date1, date2)",
  },
  {
    key: "STRING_AGG",
    label: "STRING_AGG",
    detail: "分组拼接字符串：STRING_AGG(col, 分隔符)",
  },
];

// Hive SQL独有函数
const HiveSQLFunc = [
  {
    key: "COLLECT_LIST",
    label: "COLLECT_LIST",
    detail: "分组收集为重复数组：COLLECT_LIST(col)",
  },
  {
    key: "COLLECT_SET",
    label: "COLLECT_SET",
    detail: "分组收集为去重数组：COLLECT_SET(col)",
  },
  {
    key: "CONCAT_WS",
    label: "CONCAT_WS",
    detail: "指定分隔符拼接字符串：CONCAT_WS(sep, str1, str2, ...)",
  },
  {
    key: "SPLIT",
    label: "SPLIT",
    detail: "按分隔符拆分字符串为数组：SPLIT(str, sep)",
  },
  {
    key: "REGEXP_REPLACE",
    label: "REGEXP_REPLACE",
    detail: "正则替换字符串：REGEXP_REPLACE(str, regex, rep)",
  },
  {
    key: "FROM_UNIXTIME",
    label: "FROM_UNIXTIME",
    detail: "时间戳转日期字符串：FROM_UNIXTIME(timestamp, format)",
  },
  {
    key: "UNIX_TIMESTAMP",
    label: "UNIX_TIMESTAMP",
    detail: "日期转时间戳：UNIX_TIMESTAMP(date, format)",
  },
  {
    key: "PERCENTILE",
    label: "PERCENTILE",
    detail: "计算分位数：PERCENTILE(col, p)（p取值0-1）",
  },
  {
    key: "NTILE",
    label: "NTILE",
    detail: "将数据分桶：NTILE(n) OVER (PARTITION BY col ORDER BY col)",
  },
];

// ClickHouse SQL独有函数
const ClickHouseSQLFunc = [
  {
    key: "UNIQ",
    label: "UNIQ",
    detail: "高效去重计数：UNIQ(col)",
  },
  {
    key: "UNIQCOMBINED",
    label: "UNIQCOMBINED",
    detail: "高精度高效去重计数：UNIQCOMBINED(col)",
  },
  {
    key: "ADDDAYS",
    label: "ADDDAYS",
    detail: "日期加天数：ADDDAYS(date, num)",
  },
  {
    key: "ADDMONTHS",
    label: "ADDMONTHS",
    detail: "日期加月份：ADDMONTHS(date, num)",
  },
  {
    key: "ADDYEARS",
    label: "ADDYEARS",
    detail: "日期加年份：ADDYEARS(date, num)",
  },
  {
    key: "DATEDIFF",
    label: "DATEDIFF",
    detail: "计算日期差值：DATEDIFF(unit, date1, date2)（unit：DAY/HOUR等）",
  },
  {
    key: "REPLACEONE",
    label: "REPLACEONE",
    detail: "替换第一个匹配字符串：REPLACEONE(str, old, new)",
  },
  {
    key: "REPLACEALL",
    label: "REPLACEALL",
    detail: "替换所有匹配字符串：REPLACEALL(str, old, new)",
  },
  {
    key: "EXTRACTALL",
    label: "EXTRACTALL",
    detail: "正则批量提取子串：EXTRACTALL(str, regex)",
  },
  {
    key: "INTDIV",
    label: "INTDIV",
    detail: "整数除法：INTDIV(num1, num2)",
  },
  {
    key: "RUNNINGTOTAL",
    label: "RUNNINGTOTAL",
    detail: "累计求和窗口函数：RUNNINGTOTAL(col) OVER (ORDER BY col)",
  },
  {
    key: "GROUPARRAY",
    label: "GROUPARRAY",
    detail: "分组收集为数组：GROUPARRAY(col)",
  },
  {
    key: "QUANTILE",
    label: "QUANTILE",
    detail: "计算分位数：QUANTILE(p)(col)（p取值0-1）",
  },
  {
    key: "SUMIF",
    label: "SUMIF",
    detail: "条件求和：SUMIF(col, condition)",
  },
  {
    key: "COUNTIF",
    label: "COUNTIF",
    detail: "条件计数：COUNTIF(condition)",
  },
  {
    key: "FORMATDATETIME",
    label: "FORMATDATETIME",
    detail: "日期格式化：FORMATDATETIME(datetime, format)",
  },
];

// Doris SQL独有函数
const DorisSQLFunc = [
  {
    key: "BITMAP_AGG",
    label: "BITMAP_AGG",
    detail: "聚合为位图：BITMAP_AGG(col)",
  },
  {
    key: "HLL_UNION_AGG",
    label: "HLL_UNION_AGG",
    detail: "HLL类型聚合去重：HLL_UNION_AGG(col)",
  },
  {
    key: "PERCENTILE_APPROX",
    label: "PERCENTILE_APPROX",
    detail: "近似分位数计算：PERCENTILE_APPROX(col, p)",
  },
  {
    key: "SPLIT_PART",
    label: "SPLIT_PART",
    detail: "按分隔符取指定位置子串：SPLIT_PART(str, sep, pos)",
  },
  {
    key: "REGEXP_EXTRACT",
    label: "REGEXP_EXTRACT",
    detail: "正则提取子串：REGEXP_EXTRACT(str, regex, idx)",
  },
  {
    key: "STR_TO_DATE",
    label: "STR_TO_DATE",
    detail: "字符串转日期：STR_TO_DATE(str, format)",
  },
  {
    key: "SUMIF",
    label: "SUMIF",
    detail: "条件求和：SUMIF(col, condition)",
  },
  {
    key: "COUNTIF",
    label: "COUNTIF",
    detail: "条件计数：COUNTIF(condition)",
  },
];

const variable: SqlVariableRule[] = [];

export const languageConfigMap: {
  sql: SqlLanguageConfig;
} & Partial<Record<SqlLanguageId, SqlLanguageConfig>> = {
  sql: {
    label: "SQL",
    placeholder: "输入 SQL 语句...",
    dialect: StandardSQL,
    completion: {
      func: CommonFunc.concat(StandardSQLFunc),
      variable,
    },
  },
  "hive-sql": {
    label: "HiveSQL",
    placeholder: "输入 HiveSQL 语句...",
    dialect: HiveSQL,
    completion: {
      func: CommonFunc.concat(HiveSQLFunc),
      variable,
    },
  },
  "ck-sql": {
    label: "ClickHouseSQL",
    placeholder: "输入 ClickHouseSQL 语句...",
    dialect: ClickHouseSQL,
    completion: {
      func: CommonFunc.concat(ClickHouseSQLFunc),
      variable,
    },
  },
  "doris-sql": {
    label: "DorisSQL",
    placeholder: "输入 DorisSQL 语句...",
    dialect: DorisSQL,
    completion: {
      func: CommonFunc.concat(DorisSQLFunc),
      variable,
    },
  },
};

export const getDialectBylangID: (
  languageId?: SqlLanguageId,
) => SqlLanguageConfig = (languageId?: SqlLanguageId) => {
  const config = languageId ? languageConfigMap[languageId] : undefined;
  return config ?? languageConfigMap.sql;
};
