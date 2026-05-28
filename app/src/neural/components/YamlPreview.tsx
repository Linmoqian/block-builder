import React, { useState } from 'react';
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
    <Card className="flex flex-col h-full bg-zinc-900 border-zinc-700 rounded-none">
      <CardHeader className="flex items-center justify-between px-3 py-2 bg-zinc-800 border-b border-zinc-700 space-y-0">
        <CardTitle className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">YOLO YAML</CardTitle>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleCopy}
          className="px-2 py-1 text-[10px] font-semibold text-zinc-300 hover:text-white bg-zinc-700 hover:bg-zinc-600"
        >
          {copied ? '已复制' : '复制'}
        </Button>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto p-3">
        <pre className="text-[11px] font-mono text-emerald-300 bg-zinc-900 whitespace-pre-wrap">
          {yaml || '# 添加节点以生成 YAML'}
        </pre>
      </CardContent>
    </Card>
  );
}
