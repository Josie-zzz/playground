'use client';

import React, { useMemo, useRef, useState } from 'react';

import { indentUnit } from '@codemirror/language';
import { linter, lintGutter } from '@codemirror/lint';
import type { Extension } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';
import CodeMirror from '@uiw/react-codemirror';
import classnames from 'classnames';

import EditorToolbar from './EditorToolbar';
import { defaultFormatOptions } from './constants';
import { getAcceptKeymap } from './keymap';
import { getLanguageConfig } from './languages';
import getThemeExtensions from './theme';
import { EditorThemeMode, ICodeEditorProps } from './types';

const CodeEditor: React.FC<ICodeEditorProps> = props => {
  const {
    language,
    languageConfig,
    defaultValue,
    value,
    onChange,
    className,
    placeholder,
    showToolbar = true,
    enableFormat = true,
    disabled = false,
  } = props;

  const [themeMode, setThemeMode] = useState<EditorThemeMode>('light');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const editorViewRef = useRef<EditorView>(null);

  const langConfig = useMemo(
    () =>
      getLanguageConfig({
        language,
        languageConfig,
      }),
    [language, languageConfig],
  );

  const extensions = useMemo<Extension[]>(() => {
    const cfgExtensions = langConfig?.extensions || [];
    return [
      cfgExtensions,
      indentUnit.of(' '.repeat(defaultFormatOptions.indentSize)),
      getAcceptKeymap(),
      lintGutter(),
      getThemeExtensions(themeMode),
      linter(
        (view) => languageConfig?.linter?.(view.state.doc.toString(), view) || [],
      ),
    ];
  }, [langConfig, themeMode, languageConfig]);

  const format = () => {
    const view = editorViewRef.current;
    if (!view || !langConfig?.formatText) {
      return;
    }
    const current = view.state.doc.toString();
    const formatted = langConfig.formatText(current);
    if (formatted === current) {
      return;
    }
    view.dispatch(
      view.state.update({
        changes: { from: 0, to: view.state.doc.length, insert: formatted },
      }),
    );
  };

  const copy = () => {
    const view = editorViewRef.current;
    if (!view) {
      return;
    }
    const content = view.state.doc.toString();
    navigator.clipboard.writeText(content).catch(err => {
      console.error('Failed to copy text: ', err);
    });
  };

  const toggleFullscreen = () => {
    setIsFullscreen(prev => !prev);
  };

  return (
    <div
      className={classnames('w-full h-full flex flex-col', className, {
        'fixed inset-0 w-screen h-screen z-[1000]': isFullscreen,
      })}
    >
      {showToolbar ? (
        <EditorToolbar
          onFormat={format}
          onCopy={copy}
          onToggleTheme={() =>
            setThemeMode(prev => (prev === 'light' ? 'dark' : 'light'))
          }
          onToggleFullscreen={toggleFullscreen}
          themeMode={themeMode}
          isFullscreen={isFullscreen}
          canFormat={enableFormat && !!langConfig?.formatText}
        />
      ) : null}

      <CodeMirror
        value={value}
        defaultValue={defaultValue}
        onChange={v => onChange?.(v)}
        onCreateEditor={view => {
          editorViewRef.current = view;
        }}
        editable={!disabled}
        readOnly={disabled}
        extensions={extensions}
        height="100%"
        className="flex-1 overflow-hidden"
        placeholder={placeholder ?? langConfig?.placeholder}
      />
    </div>
  );
};

export default CodeEditor;
