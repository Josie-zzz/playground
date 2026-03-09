import { defaultFormatOptions } from "../../constants";

const formatJsonText = (text: string) => {
  const trimmed = text.trim();
  if (!trimmed) {
    return text;
  }
  try {
    const formatted = JSON.stringify(JSON.parse(trimmed), null, defaultFormatOptions.indentSize);
    return formatted
  } catch (error) {
    return text
  }
};

export default formatJsonText;
