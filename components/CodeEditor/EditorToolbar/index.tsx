import { Button, Tooltip } from "antd";
import {
  // Check,
  ClearOutlined,
  FullscreenOutlined, // Moon,
  FullscreenExitOutlined, // Sun,
} from "@ant-design/icons";
import type { CSSProperties, FC, ReactNode } from "react";

interface EditorToolbarProps {
  /** Callback for formatting code */
  onFormat?: () => void;
  onCopy?: () => void;
  onToggleTheme?: () => void;
  onToggleFullscreen?: () => void;
  onValidate?: () => void;
  themeMode: "light" | "dark";
  isFullscreen: boolean;
  canFormat: boolean;
}

interface ActionItem {
  key: string;
  title: string;
  label: string;
  icon: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  visible?: boolean;
}

const EditorToolbar: FC<EditorToolbarProps> = ({
  onFormat,
  onCopy,
  onToggleTheme,
  onValidate,
  onToggleFullscreen,
  themeMode,
  isFullscreen,
  canFormat,
}) => {
  const buttonStyle: CSSProperties = {
    background: themeMode === "dark" ? "#282c34" : "#fff",
    color: themeMode === "dark" ? "#fff" : "#333",
    borderColor: themeMode === "dark" ? "#3a3f4b" : "#ddd",
  };

  const actions: ActionItem[] = [
    {
      key: "format",
      title: "格式化代码",
      label: "格式化",
      icon: <ClearOutlined style={{ fontSize: 14 }} />,
      onClick: onFormat,
      disabled: !onFormat,
      visible: canFormat,
    },
    // {
    //   key: "validate",
    //   title: "校验SQL",
    //   label: "校验",
    //   icon: <Check size={14} fill={iconFill} />,
    //   onClick: onValidate,
    //   disabled: !onValidate,
    //   visible: true,
    // },
    // {
    //   key: "copy",
    //   title: "复制内容",
    //   label: "复制",
    //   icon: <Copy size={14} fill={iconFill} />,
    //   onClick: onCopy,
    //   disabled: !onCopy,
    //   visible: true,
    // },
    // {
    //   key: "theme",
    //   title: "切换主题",
    //   label: themeMode === "light" ? "暗色" : "亮色",
    //   icon:
    //     themeMode === "light" ? (
    //       <Moon size={14} fill={iconFill} />
    //     ) : (
    //       <Sun size={14} fill={iconFill} />
    //     ),
    //   onClick: onToggleTheme,
    //   disabled: !onToggleTheme,
    //   visible: true,
    // },
    {
      key: "fullscreen",
      title: isFullscreen ? "退出全屏" : "全屏",
      label: isFullscreen ? "退出全屏" : "全屏",
      icon: isFullscreen ? (
        <FullscreenExitOutlined style={{ fontSize: 14 }} />
      ) : (
        <FullscreenOutlined style={{ fontSize: 14 }} />
      ),
      onClick: onToggleFullscreen,
      disabled: !onToggleFullscreen,
      visible: true,
    },
  ];

  return (
    <div
      style={{
        padding: "8px 12px",
        display: "flex",
        justifyContent: "flex-end",
        borderBottom: "1px solid #e0e0e0",
        background: themeMode === "dark" ? "#1e2227" : "#f9f9f9",
      }}
    >
      <div style={{ display: "flex", gap: 8 }}>
        {actions
          .filter((action) => action.visible !== false)
          .map(({ key, title, label, icon, onClick, disabled }) => (
            <Tooltip key={key} title={title}>
              <Button
                size="small"
                style={buttonStyle}
                onClick={onClick}
                disabled={disabled}
              >
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  {icon}
                  {label}
                </span>
              </Button>
            </Tooltip>
          ))}
      </div>
    </div>
  );
};

export default EditorToolbar;
