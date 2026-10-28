import React from 'react';
import Editor from '@monaco-editor/react';
import { useI18n } from '../i18n/context';

// Tema editor mengikuti palet Zenith dan menyatu dengan warna panel
function defineZenithTheme(monaco) {
  monaco.editor.defineTheme('zenith', {
    base: 'vs-dark',
    inherit: true,
    rules: [],
    colors: {
      'editor.background': '#0a1230',
      'editorGutter.background': '#0a1230',
      'editorLineNumber.foreground': '#3d5088',
      'editorLineNumber.activeForeground': '#8fa8d9',
      'editor.lineHighlightBackground': '#11204f66',
      'editor.selectionBackground': '#7cc8ff33',
    },
  });
}

export default function CodeEditor({ code, onChange }) {
  const { t } = useI18n();

  const handleEditorChange = (value) => {
    if (value !== undefined) {
      onChange(value);
    }
  };

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      <div className="flex h-9 shrink-0 items-center justify-between px-5 text-xs text-mute">
        <span>{t('editor.file')}</span>
        <span>{t('editor.auto')}</span>
      </div>

      <div className="relative flex-1">
        <Editor
          height="100%"
          defaultLanguage="javascript"
          theme="zenith"
          beforeMount={defineZenithTheme}
          value={code}
          onChange={handleEditorChange}
          options={{
            fontSize: 13,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            fontFamily: "'Fira Code', 'Cascadia Code', Consolas, monospace",
            fontLigatures: true,
            padding: { top: 12, bottom: 12 },
            lineNumbersMinChars: 3,
            folding: true,
            smoothScrolling: true,
          }}
        />
      </div>
    </div>
  );
}