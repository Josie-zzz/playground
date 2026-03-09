import darkTheme from "./dark";
import lightTheme from "./light";

// 统一样式配置，避免冲突
const getThemeExtensions = (theme: string) => {
  if (theme === "dark") {
    return darkTheme;
  }
  return lightTheme;
};

export default getThemeExtensions;
