import { SQLDialect } from "@codemirror/lang-sql";

import { SqlFunction } from "../../types";

// ?------------------------------------ 关键字 ------------------------------------
// 公共关键字（所有主流SQL引擎均支持的核心单个关键字，无重复）
const CommonKeywords =
  "select from where group by having order distinct and or not in between like is null case when then else end join inner left right full on as union all cast create table drop alter insert into values update set delete view limit key";

// 标准SQL独有关键字（仅SQL标准定义、非公共/非其他引擎独有）
const StandardSQLKeywords =
  "with recursive merge fetch offset rollup cube grouping sets listagg interval";

// Hive SQL独有关键字（仅Hive支持、非公共/非ClickHouse/Doris独有）
const HiveSQLKeywords =
  "lateral explode overwrite distribute sort cluster external msck repair partition";

// ClickHouse SQL独有关键字（仅ClickHouse支持、非公共/非Hive/Doris独有）
const ClickHouseSQLKeywords = "engine ttl materialized settings any format";

// Doris SQL独有关键字（仅Doris支持、非公共/非Hive/ClickHouse独有）
const DorisSQLKeywords =
  "duplicate aggregate unique stream broker load properties resource";

// ?------------------------------------ 数据类型 ------------------------------------
// 公共数据类型（所有主流SQL引擎均支持的核心数据类型，无重复）
const CommonType =
  "tinyint smallint int bigint float double decimal char varchar boolean date timestamp";

// 标准SQL独有数据类型（仅SQL标准定义、非公共/非其他引擎独有）
const StandardSQLType = "time numeric integer interval";

// Hive SQL独有数据类型（仅Hive支持、非公共/非ClickHouse/Doris独有）
const HiveSQLType = "string array map struct binary";

// ClickHouse SQL独有数据类型（仅ClickHouse支持、非公共/非Hive/Doris独有）
const ClickHouseSQLType =
  "int8 int16 int32 int64 uint8 uint16 uint32 uint64 float32 float64 enum8 enum16 uuid ipv4 ipv6 fixedstring string date32 datetime datetime64";

// Doris SQL独有数据类型（仅Doris支持、非公共/非Hive/ClickHouse独有）
const DorisSQLType = "bitmap hll json decimalv2 largeint";

// ?------------------------------------ 语言配置 ------------------------------------
// 标准SQL.
export const StandardSQL = (funcRules?: SqlFunction[]) =>
  SQLDialect.define({
    keywords: `${CommonKeywords} ${StandardSQLKeywords}`,
    types: `${CommonType} ${StandardSQLType}`,
    operatorChars: "*+-%<>!=&|~^/",
    identifierQuotes: '`"',
    spaceAfterDashes: true,
    builtin:
      funcRules?.map((func) => func.key?.toLocaleLowerCase()).join(" ") || "",
  });

// Hive.
export const HiveSQL = (funcRules?: SqlFunction[]) =>
  SQLDialect.define({
    keywords: `${CommonKeywords} ${HiveSQLKeywords}`,
    types: `${CommonType} ${HiveSQLType}`,
    operatorChars: "*+-%<>!=&|~^/",
    identifierQuotes: '`"',
    spaceAfterDashes: true,
    builtin:
      funcRules?.map((func) => func.key?.toLocaleLowerCase()).join(" ") || "",
  });

// ClickHouse.
export const ClickHouseSQL = (funcRules?: SqlFunction[]) =>
  SQLDialect.define({
    keywords: `${CommonKeywords} ${ClickHouseSQLKeywords}`,
    types: `${CommonType} ${ClickHouseSQLType}`,
    operatorChars: "*+-%<>!=&|~^/",
    identifierQuotes: '`"',
    slashComments: true,
    builtin:
      funcRules?.map((func) => func.key?.toLocaleLowerCase()).join(" ") || "",
  });

// Doris
export const DorisSQL = (funcRules?: SqlFunction[]) =>
  SQLDialect.define({
    keywords: `${CommonKeywords} ${DorisSQLKeywords}`,
    types: `${CommonType} ${DorisSQLType}`,
    operatorChars: "*+-%<>!=&|~^/",
    identifierQuotes: '`"',
    hashComments: true,
    spaceAfterDashes: true,
    builtin:
      funcRules?.map((func) => func.key?.toLocaleLowerCase()).join(" ") || "",
  });
