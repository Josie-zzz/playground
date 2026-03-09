import {
  type Completion,
  type CompletionContext,
  type CompletionResult,
} from '@codemirror/autocomplete';
import { type Extension, Prec, RangeSetBuilder } from '@codemirror/state';
import {
  Decoration,
  type DecorationSet,
  EditorView,
  ViewPlugin,
  type ViewUpdate,
} from '@codemirror/view';

import type { SqlCompletionConfig, SqlVariableRule } from '../../types';

const HASH_INITIAL = 5381;
const HASH_SHIFT = 5;
const HASH_RADIX = 36;

/**
 * 转义正则表达式中的特殊字符
 */
export const escapeForRegExp = (input: string) =>
  input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const getRegExpByTagName = (start: string, end: string) =>
  new RegExp(`${escapeForRegExp(start)}[^\\n]*?${escapeForRegExp(end)}`, 'g');

const hashString = (input: string) => {
  let hash = HASH_INITIAL;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << HASH_SHIFT) + hash) ^ input.charCodeAt(i);
  }
  return (hash >>> 0).toString(HASH_RADIX);
};

const prefixCmClassToken = (token: string) => {
  const trimmed = token.trim();
  if (!trimmed) {
    return '';
  }
  if (trimmed.startsWith('cm-')) {
    return `cm-sql-${trimmed.slice('cm-'.length)}`;
  }
  return `cm-sql-${trimmed}`;
};

const buildVariableOptions = (rule: SqlVariableRule): Completion[] =>
  (rule.options ?? []).map(option => ({
    label: option.key,
    apply: option.key,
    type: 'variable',
    detail: option.label,
    boost: option.boost,
  }));

// 是否匹配上了自定义语法
export const matchSqlVariableContext = (
  context: CompletionContext,
  rules: SqlCompletionConfig['variable'] | undefined,
) => {
  const variableRules = rules ?? [];

  for (const rule of variableRules) {
    const { endTag, startTag } = rule;
    if (!startTag || !endTag) {
      continue;
    }

    const trigger = rule.trigger ?? rule.startTag;
    const escapedTrigger = escapeForRegExp(trigger);
    const escapedEndTag = escapeForRegExp(endTag);
    const matchPattern = `${escapedTrigger}[^\\n]*$`;
    const match = context.matchBefore(new RegExp(matchPattern));

    if (!match) {
      continue;
    }
    if (escapedEndTag && new RegExp(`${escapedEndTag}$`).test(match.text)) {
      continue;
    }

    return { rule, match, matchPattern };
  }

  return null;
};

// 自定义语法补全
export const variableCompletionSource = (
  rules: SqlCompletionConfig['variable'],
): ((context: CompletionContext) => CompletionResult | null) => {
  const variableRules = rules ?? [];
  const variableRuleOptions = new Map<string, Completion[]>();
  for (const rule of variableRules) {
    const mapKey = `${rule.startTag}${rule.endTag}`
    variableRuleOptions.set(mapKey, [...variableRuleOptions.get(mapKey) ?? [], ...buildVariableOptions(rule)]);
  }

  return context => {
    const ctxMatch = matchSqlVariableContext(context, variableRules);
    if (!ctxMatch) {
      return null;
    }

    const { rule, match, matchPattern } = ctxMatch;
    const { endTag } = rule;
    const baseOptions = variableRuleOptions.get(`${rule.startTag}${rule.endTag}`) ?? [];
    const options = baseOptions.map(option => {
      const insertText =
        typeof option.apply === 'string' ? option.apply : option.label;

      // todo  再看看
      return {
        ...option,
        apply: (
          view: EditorView,
          _completion: Completion,
          from: number,
          to: number,
        ) => {
          const finalInsert = insertText.endsWith(endTag)
            ? insertText
            : `${insertText}${endTag}`;
          let consumeEndTagLength = 0;
          const maxConsume = Math.min(
            endTag.length,
            view.state.doc.length - to,
          );
          for (let len = maxConsume; len >= 1; len--) {
            if (view.state.sliceDoc(to, to + len) === endTag.slice(0, len)) {
              consumeEndTagLength = len;
              break;
            }
          }
          const replaceTo = to + consumeEndTagLength;

          view.dispatch({
            changes: { from, to: replaceTo, insert: finalInsert },
            selection: { anchor: from + finalInsert.length },
          });
        },
      };
    });
    return {
      from: match.from,
      to: match.to,
      options,
      validFor: new RegExp(matchPattern),
    };
  };
};

// 自定义语法高亮
export const sqlVariableHighlight = (
  rules: SqlCompletionConfig['variable'],
): Extension => {
  const variableRules = rules ?? [];

  // 生成自定义语法的样式类
  const ruleMetas = variableRules
    .map((rule, index) => {
      const { startTag, endTag } = rule;
      if (!startTag || !endTag) {
        return null;
      }

      const id = hashString(`${startTag}\u0000${endTag}\u0000${index}`);
      const tagClass = prefixCmClassToken(`cm-var-${id}-tag`);
      const separatorClass = prefixCmClassToken(`cm-var-${id}-separator`);
      const contentStyle = rule.highlightStyle?.contentStyle ?? [];
      const contentTokenClasses = contentStyle.map((_style, styleIndex) =>
        prefixCmClassToken(`cm-var-${id}-token-${styleIndex}`),
      );

      const allowedFullMatch = new Set<string>();
      for (const option of rule.options ?? []) {
        const raw = option.key;
        if (!raw) {
          continue;
        }
        const withStart = raw.startsWith(startTag) ? raw : `${startTag}${raw}`;
        const full = withStart.endsWith(endTag)
          ? withStart
          : `${withStart}${endTag}`;
        allowedFullMatch.add(full);
      }

      return {
        startTag,
        endTag,
        startTagLength: startTag.length,
        endTagLength: endTag.length,
        regex: getRegExpByTagName(startTag, endTag),
        separator: rule.highlightStyle?.separator,
        highlightStyle: {
          tagClass,
          separatorClass,
          contentTokenClasses,
          tagStyle: rule.highlightStyle?.tagStyle,
          separatorStyle: rule.highlightStyle?.separatorStyle,
          contentStyle,
        },
        allowedFullMatch,
        allowEdit: rule.allowEdit ?? true,
      };
    })
    .filter(Boolean);

  // 生成样式插件
  const themeSpec: Record<string, any> = {};
  for (const meta of ruleMetas) {
    if (!meta) {
      continue;
    }
    const highlightStyle = meta.highlightStyle;
    if (highlightStyle.tagStyle) {
      themeSpec[`.${highlightStyle.tagClass}`] = highlightStyle.tagStyle;
      // 当前这个标记有可能会被别的高亮加上样式类，所以加上 * 可以用当前样式覆盖掉
      themeSpec[`.${highlightStyle.tagClass} *`] = highlightStyle.tagStyle;
    }
    if (highlightStyle.separatorStyle) {
      themeSpec[`.${highlightStyle.separatorClass}`] = highlightStyle.separatorStyle;
      themeSpec[`.${highlightStyle.separatorClass} *`] = highlightStyle.separatorStyle;
    }
    if (meta.separator) {
      highlightStyle.contentStyle.forEach((style, styleIndex) => {
        const className = highlightStyle.contentTokenClasses[styleIndex];
        if (!className) {
          return;
        }
        themeSpec[`.${className}`] = style;
        themeSpec[`.${className} *`] = style;
      });
    } else {
      if (highlightStyle.contentStyle[0]) {
        themeSpec[`.${highlightStyle.contentTokenClasses[0]}`] = highlightStyle.contentStyle[0];
        themeSpec[`.${highlightStyle.contentTokenClasses[0]} *`] = highlightStyle.contentStyle[0];
      }
    }
  }
  const customRulesTheme = Prec.highest(EditorView.theme(themeSpec as any));

  const plugin = ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;
      atomicRanges: DecorationSet;
      constructor(view: EditorView) {
        const { decorations, atomicRanges } = this.buildDecorations(view);
        this.decorations = decorations;
        this.atomicRanges = atomicRanges;
      }
      update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged) {
          const { decorations, atomicRanges } = this.buildDecorations(
            update.view,
          );
          this.decorations = decorations;
          this.atomicRanges = atomicRanges;
        }
      }
      buildDecorations(view: EditorView) {
        const builder = new RangeSetBuilder<Decoration>();
        const atomicBuilder = new RangeSetBuilder<Decoration>();
        const ranges: { from: number; to: number; deco: Decoration }[] = [];
        const atomicRangeItems: {
          from: number;
          to: number;
          deco: Decoration;
        }[] = [];
        const atomicDeco = Decoration.mark({});

        for (const { from, to } of view.visibleRanges) {
          const text = view.state.doc.sliceString(from, to);

          ruleMetas.forEach(meta => {
            if (!meta) {
              return;
            }
            const highlightStyle = meta.highlightStyle;

            meta.regex.lastIndex = 0;
            let match: RegExpExecArray | null;
            while ((match = meta.regex.exec(text))) {
              const start = from + match.index;
              const matchText = match[0];
              const end = start + matchText.length;

              if (!meta.allowedFullMatch.has(matchText)) {
                continue;
              }

              if (matchText.length < meta.startTagLength + meta.endTagLength) {
                continue;
              }

              const innerFrom = start + meta.startTagLength;
              const innerTo = end - meta.endTagLength;

              // 当前这个元素是否可以修改
              if (!meta.allowEdit) {
                atomicRangeItems.push({
                  from: start,
                  to: end,
                  deco: atomicDeco,
                });
              }

              // 给标签添加样式
              if (highlightStyle.tagStyle) {
                ranges.push({
                  from: start,
                  to: innerFrom,
                  deco: Decoration.mark({ class: highlightStyle.tagClass }),
                });
                ranges.push({
                  from: innerTo,
                  to: end,
                  deco: Decoration.mark({ class: highlightStyle.tagClass }),
                });
              }

              // 遍历内容部分
              if (innerFrom < innerTo) {
                const separator = meta.separator ?? '';
                const contentStyles = highlightStyle.contentStyle ?? [];
                // 如果有分隔符，并且有样式设置的话
                if (separator && contentStyles.length > 0) {
                  // 取出内容部分
                  const innerText = matchText.slice(
                    meta.startTagLength,
                    matchText.length - meta.endTagLength,
                  );
                  const separatorLength = separator.length;
                  const parts = innerText.split(separator);
                  let offset = 0;
                  for (let partIndex = 0; partIndex < parts.length; partIndex++) {
                    const part = parts[partIndex] ?? '';
                    const fromOffset = offset;
                    const toOffset = offset + part.length;
                    const styleIndex = Math.min(
                      partIndex,
                      // 如果没设置用最后一个样式
                      highlightStyle.contentTokenClasses.length - 1,
                    );
                    const styleClass = highlightStyle.contentTokenClasses[styleIndex];
                    if (part.length > 0 && styleClass) {
                      ranges.push({
                        from: innerFrom + fromOffset,
                        to: innerFrom + toOffset,
                        deco: Decoration.mark({ class: styleClass }),
                      });
                    }
                    offset = toOffset;
                    if (partIndex < parts.length - 1) {
                      // 给分隔符添加样式，如果有的话
                      if (highlightStyle.separatorStyle) {
                        ranges.push({
                          from: innerFrom + offset,
                          to: innerFrom + offset + separatorLength,
                          deco: Decoration.mark({
                            class: highlightStyle.separatorClass,
                          }),
                        });
                      }
                      offset += separatorLength;
                    }
                  }
                } else if (!separator && contentStyles[0]) {
                  // 如果没有分隔符就用第一个样式
                  ranges.push({
                    from: innerFrom,
                    to: innerTo,
                    deco: Decoration.mark({
                      class: highlightStyle.contentTokenClasses[0],
                    }),
                  });
                }
              }
            }
          });
        }

        ranges.sort((a, b) => a.from - b.from || a.to - b.to);
        for (const range of ranges) {
          builder.add(range.from, range.to, range.deco);
        }
        atomicRangeItems.sort((a, b) => a.from - b.from || a.to - b.to);
        for (const range of atomicRangeItems) {
          atomicBuilder.add(range.from, range.to, range.deco);
        }
        return {
          decorations: builder.finish(),
          atomicRanges: atomicBuilder.finish(),
        };
      }
    },
    {
      decorations: v => v.decorations,
      provide: plugin =>
        EditorView.atomicRanges.of(
          view => view.plugin(plugin)?.atomicRanges || Decoration.none,
        ),
    },
  );

  return [customRulesTheme, plugin];
};
