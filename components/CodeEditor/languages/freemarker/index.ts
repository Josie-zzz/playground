import { autocompletion } from "@codemirror/autocomplete";

import { EditorLanguageConfig, SqlLanguageOptions } from "../../types";
import { mergeSqlFuncRules } from "../common/merge";
import {
  fmDirectiveCompletionSource,
  fmFunctionCompletionSource,
} from "./completion";
import { completion } from "./constants";
import { createFltFormatText } from "./formatText";
import { fltLinter } from "./linter";
import { flt } from "./register";

export const createFltLanguageConfig = (
  languageConfig?: SqlLanguageOptions,
): EditorLanguageConfig => {
  const funcRules = mergeSqlFuncRules(
    completion.func,
    languageConfig?.completion?.func,
  );
  return {
    id: "freemarker",
    label: "FreeMarker",
    placeholder: "输入 FreeMarker 模板...",
    extensions: [
      flt(),
      fltLinter,
      autocompletion({
        override: [
          fmFunctionCompletionSource(funcRules),
          fmDirectiveCompletionSource,
        ],
      }),
    ],
    formatText: createFltFormatText(),
  };
};
