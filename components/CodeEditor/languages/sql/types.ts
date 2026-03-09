import { SQLConfig } from "@codemirror/lang-sql";

import { SqlCompletionConfig } from "../../types";

export interface SqlLanguageOptions {
  schema?: SQLConfig["schema"];
  completion?: SqlCompletionConfig;
}
