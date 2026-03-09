import type {
  EditorLanguageConfig,
  EditorLanguageId,
  SqlLanguageId,
} from "../types";
import { SqlLanguageOptions } from "../types";
import { createFmSqlLanguageConfig } from "./fm-sql";
import { createFltLanguageConfig } from "./freemarker";
import { createJsonLanguageConfig } from "./json";
import { createSqlLanguageConfig } from "./sql";

export const getLanguageConfig = (options: {
  language: EditorLanguageId;
  languageConfig?: SqlLanguageOptions;
}): EditorLanguageConfig | null => {
  const { language, languageConfig } = options;

  switch (language) {
    case "hive-sql":
    case "ck-sql":
    case "doris-sql":
    case "sql": {
      if (languageConfig?.useFreeMarker) {
        return createFmSqlLanguageConfig(
          languageConfig,
          language as SqlLanguageId,
        );
      }
      return createSqlLanguageConfig(languageConfig, language);
    }
    case "freemarker":
      return createFltLanguageConfig(languageConfig);
    case "json":
      return createJsonLanguageConfig();
    default: {
      return null;
    }
  }
};

export { EditorLanguageId };
