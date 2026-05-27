import React from 'react';
import {
  defaultTheme,
  pythonKeywords,
  pythonBuiltins,
  CodeTheme
} from '../config/codeTheme';

interface CodeHighlighterProps {
  code: string;
  theme?: CodeTheme;
  showLineNumbers?: boolean;
}

/**
 * Python 代码语法高亮组件
 */
export const CodeHighlighter: React.FC<CodeHighlighterProps> = ({
  code,
  theme = defaultTheme,
  showLineNumbers = true
}) => {
  const highlightLine = (line: string): React.ReactNode => {
    const tokens = tokenizePython(line);
    return tokens.map((token, index) => {
      const color = getTokenColor(token, theme);
      return (
        <span key={index} style={{ color }}>
          {token.value}
        </span>
      );
    });
  };

  const lines = code.split('\n');

  return (
    <pre
      className="leading-relaxed whitespace-pre-wrap break-all"
      style={{ color: theme.foreground }}
    >
      {lines.map((line, i) => (
        <div key={i} className="flex">
          {showLineNumbers && (
            <span
              className="select-none w-8 text-right pr-3 flex-shrink-0"
              style={{ color: theme.lineNumber }}
            >
              {i + 1}
            </span>
          )}
          <span>{highlightLine(line) || '\u00A0'}</span>
        </div>
      ))}
    </pre>
  );
};

/**
 * Token 类型
 */
interface Token {
  type: TokenType;
  value: string;
}

type TokenType =
  | 'keyword'
  | 'builtin'
  | 'string'
  | 'number'
  | 'comment'
  | 'function'
  | 'operator'
  | 'punctuation'
  | 'variable'
  | 'text';

/**
 * Python 词法分析
 */
function tokenizePython(code: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < code.length) {
    // 跳过空白
    if (/\s/.test(code[i])) {
      let whitespace = '';
      while (i < code.length && /\s/.test(code[i])) {
        whitespace += code[i];
        i++;
      }
      tokens.push({ type: 'text', value: whitespace });
      continue;
    }

    // 注释
    if (code[i] === '#') {
      let comment = '';
      while (i < code.length && code[i] !== '\n') {
        comment += code[i];
        i++;
      }
      tokens.push({ type: 'comment', value: comment });
      continue;
    }

    // 字符串
    if (code[i] === '"' || code[i] === "'") {
      const quote = code[i];
      let str = quote;
      i++;
      while (i < code.length) {
        if (code[i] === '\\' && i + 1 < code.length) {
          str += code[i] + code[i + 1];
          i += 2;
          continue;
        }
        str += code[i];
        i++;
        if (code[i - 1] === quote) break;
      }
      tokens.push({ type: 'string', value: str });
      continue;
    }

    // 数字
    if (/\d/.test(code[i])) {
      let num = '';
      while (i < code.length && /[\d.xXa-fA-F]/.test(code[i])) {
        num += code[i];
        i++;
      }
      tokens.push({ type: 'number', value: num });
      continue;
    }

    // 标识符
    if (/[a-zA-Z_]/.test(code[i])) {
      let identifier = '';
      while (i < code.length && /[a-zA-Z0-9_]/.test(code[i])) {
        identifier += code[i];
        i++;
      }

      // 判断类型
      if (pythonKeywords.includes(identifier)) {
        tokens.push({ type: 'keyword', value: identifier });
      } else if (pythonBuiltins.includes(identifier)) {
        tokens.push({ type: 'builtin', value: identifier });
      } else {
        // 检查是否是函数调用
        const nextNonSpace = code.slice(i).match(/^\s*\(/);
        if (nextNonSpace) {
          tokens.push({ type: 'function', value: identifier });
        } else {
          tokens.push({ type: 'variable', value: identifier });
        }
      }
      continue;
    }

    // 操作符
    if (/[+\-*/%=<>!&|^~]/.test(code[i])) {
      let op = '';
      while (i < code.length && /[+\-*/%=<>!&|^~]/.test(code[i])) {
        op += code[i];
        i++;
      }
      tokens.push({ type: 'operator', value: op });
      continue;
    }

    // 括号和标点
    if (/[(){}\[\],.:;]/ .test(code[i])) {
      tokens.push({ type: 'punctuation', value: code[i] });
      i++;
      continue;
    }

    // 其他字符
    tokens.push({ type: 'text', value: code[i] });
    i++;
  }

  return tokens;
}

/**
 * 获取 Token 颜色
 */
function getTokenColor(token: Token, theme: CodeTheme): string {
  switch (token.type) {
    case 'keyword':
      return theme.keyword;
    case 'builtin':
      return theme.builtin;
    case 'string':
      return theme.string;
    case 'number':
      return theme.number;
    case 'comment':
      return theme.comment;
    case 'function':
      return theme.function;
    case 'operator':
      return theme.operator;
    case 'punctuation':
      return theme.punctuation;
    case 'variable':
      return theme.variable;
    default:
      return theme.foreground;
  }
}

export default CodeHighlighter;
