import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface YamlPreviewProps {
  yaml: string;
}

export function YamlPreview({ yaml }: YamlPreviewProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(yaml);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="flex flex-col h-full bg-zinc-950">
      <CardHeader className="flex items-center justify-between px-4 py-2.5 bg-zinc-900 border-b border-zinc-800 space-y-0">
        <CardTitle className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">YOLO YAML</CardTitle>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleCopy}
          className="px-2 py-1 text-[11px] font-semibold text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700"
        >
          {copied ? '已复制' : '复制'}
        </Button>
      </CardHeader>
      <CardContent className="flex-1 p-0 overflow-hidden">
        <Editor
          height="100%"
          language="yaml"
          theme="vs-dark"
          value={yaml || '# 添加节点以生成 YAML'}
          options={{
            readOnly: true,
            minimap: { enabled: false },
            fontSize: 12,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            padding: { top: 16 },
            renderLineHighlight: 'none',
            overviewRulerBorder: false,
            scrollbar: { verticalScrollbarSize: 6, horizontalScrollbarSize: 6 },
          }}
        />
      </CardContent>
    </Card>
  );
}
