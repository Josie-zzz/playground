import type {
  SqlCompletionConfig,
  SqlFunction,
  SqlVariableRule,
} from "../../types";

/**
 * 合并自定义的变量规则，根据startTag和endTag去重，以external为准。如果不一样的话就直接合并不做处理。
 * @param builtIn 内置的变量规则
 * @param external 外部的变量规则
 * @returns 合并后的变量规则
 */
export const mergeVariableRules = (
  builtIn?: SqlCompletionConfig["variable"],
  external?: SqlCompletionConfig["variable"],
): SqlVariableRule[] => {
  const merged: SqlVariableRule[] = [...(builtIn ?? [])];

  for (const extRule of external ?? []) {
    const index = merged.findIndex(
      (rule) =>
        rule.startTag === extRule.startTag && rule.endTag === extRule.endTag,
    );

    if (index === -1 || extRule.noMerge) {
      merged.push(extRule);
      continue;
    }

    const baseRule = merged[index];
    const baseOptions = baseRule.options ?? [];
    const extOptions = extRule.options ?? [];

    // 针对options的合并，根据key去重，以external为准
    const options: SqlVariableRule["options"] = [...baseOptions];
    const indexByKey = new Map<string, number>();
    for (let i = 0; i < options.length; i++) {
      indexByKey.set(options[i].key, i);
    }

    for (const option of extOptions) {
      const optionIndex = indexByKey.get(option.key);
      if (optionIndex === undefined) {
        indexByKey.set(option.key, options.length);
        options.push(option);
        continue;
      }
      options[optionIndex] = option;
    }

    // 合并其他属性，以external为准
    merged[index] = { ...baseRule, ...extRule, options };
  }

  return merged;
};

/**
 * 合并自定义的函数规则，根据key去重，以external为准。
 * @param builtIn 内置的函数规则
 * @param external 外部的函数规则
 * @returns 合并后的函数规则
 */
export const mergeSqlFuncRules = (
  builtIn?: SqlCompletionConfig["func"],
  external?: SqlCompletionConfig["func"],
): SqlFunction[] => {
  const merged: SqlFunction[] = [...(builtIn ?? [])];
  const indexByKey = new Map<string, number>();
  for (let i = 0; i < merged.length; i++) {
    indexByKey.set(merged[i].key, i);
  }

  for (const extFunc of external ?? []) {
    const index = indexByKey.get(extFunc.key);
    if (index === undefined) {
      indexByKey.set(extFunc.key, merged.length);
      merged.push(extFunc);
      continue;
    }
    merged[index] = extFunc;
  }

  return merged;
};
