import { json, jsonParseLinter } from "@codemirror/lang-json";

import { defaultFormatOptions } from "../../constants";
import type { EditorLanguageConfig } from "../../types";
import { linter } from "@codemirror/lint";
import formatJsonText from "./format";

export const createJsonLanguageConfig = (): EditorLanguageConfig => ({
  id: "json",
  label: "JSON",
  placeholder: "请输入json",
  extensions: [json(), linter(jsonParseLinter())],
  formatText: formatJsonText,
});

