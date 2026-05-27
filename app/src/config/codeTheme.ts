/**
 * 代码阅读器主题配置
 * 参考 VS Code Dark+ 主题
 */

export interface CodeTheme {
  // 基础颜色
  background: string;
  foreground: string;
  lineNumber: string;
  lineHighlight?: string;

  // 关键字
  keyword: string;        // def, class, if, else, for, while, return, import
  keywordControl: string; // True, False, None

  // 函数和方法
  function: string;       // 函数名
  functionCall: string;   // 函数调用

  // 字符串
  string: string;         // "string", 'string'
  stringEscape: string;   // \n, \t

  // 数字
  number: string;         // 123, 3.14

  // 注释
  comment: string;        // # comment

  // 变量和参数
  variable: string;       // 变量名
  parameter: string;      // 参数名

  // 操作符
  operator: string;       // =, +, -, *, /

  // 括号
  punctuation: string;    // (, ), [, ], {, }

  // 特殊
  decorator: string;      // @decorator
  className: string;      // 类名
  builtin: string;        // print, len, range 等
}

/**
 * VS Code Dark+ 主题
 */
export const darkPlusTheme: CodeTheme = {
  // 基础颜色
  background: '#1e1e1e',
  foreground: '#d4d4d4',
  lineNumber: '#858585',

  // 关键字 - 紫红色
  keyword: '#c586c0',
  keywordControl: '#569cd6',

  // 函数 - 黄色
  function: '#dcdcaa',
  functionCall: '#dcdcaa',

  // 字符串 - 橙色
  string: '#ce9178',
  stringEscape: '#d7ba7d',

  // 数字 - 浅绿色
  number: '#b5cea8',

  // 注释 - 绿色
  comment: '#6a9955',

  // 变量 - 浅蓝色
  variable: '#9cdcfe',
  parameter: '#9cdcfe',

  // 操作符 - 白色
  operator: '#d4d4d4',

  // 括号 - 白色
  punctuation: '#d4d4d4',

  // 特殊
  decorator: '#d7ba7d',
  className: '#4ec9b0',
  builtin: '#dcdcaa',
};

/**
 * One Dark Pro 主题
 */
export const oneDarkTheme: CodeTheme = {
  background: '#282c34',
  foreground: '#abb2bf',
  lineNumber: '#5c6370',

  keyword: '#c678dd',
  keywordControl: '#e5c07b',

  function: '#61afef',
  functionCall: '#61afef',

  string: '#98c379',
  stringEscape: '#56b6c2',

  number: '#d19a66',

  comment: '#5c6370',

  variable: '#e06c75',
  parameter: '#e06c75',

  operator: '#56b6c2',

  punctuation: '#abb2bf',

  decorator: '#61afef',
  className: '#e5c07b',
  builtin: '#61afef',
};

/**
 * GitHub Dark 主题
 */
export const githubDarkTheme: CodeTheme = {
  background: '#0d1117',
  foreground: '#c9d1d9',
  lineNumber: '#6e7681',

  keyword: '#ff7b72',
  keywordControl: '#79c0ff',

  function: '#d2a8ff',
  functionCall: '#d2a8ff',

  string: '#a5d6ff',
  stringEscape: '#7ee787',

  number: '#79c0ff',

  comment: '#8b949e',

  variable: '#ffa657',
  parameter: '#ffa657',

  operator: '#c9d1d9',

  punctuation: '#c9d1d9',

  decorator: '#d2a8ff',
  className: '#7ee787',
  builtin: '#d2a8ff',
};

/**
 * 默认主题
 */
export const defaultTheme = darkPlusTheme;

/**
 * Python 关键字列表
 */
export const pythonKeywords = [
  'False', 'None', 'True', 'and', 'as', 'assert', 'async', 'await',
  'break', 'class', 'continue', 'def', 'del', 'elif', 'else', 'except',
  'finally', 'for', 'from', 'global', 'if', 'import', 'in', 'is',
  'lambda', 'nonlocal', 'not', 'or', 'pass', 'raise', 'return', 'try',
  'while', 'with', 'yield'
];

/**
 * Python 内置函数列表
 */
export const pythonBuiltins = [
  'abs', 'all', 'any', 'bin', 'bool', 'bytearray', 'bytes', 'callable',
  'chr', 'classmethod', 'compile', 'complex', 'delattr', 'dict', 'dir',
  'divmod', 'enumerate', 'eval', 'exec', 'filter', 'float', 'format',
  'frozenset', 'getattr', 'globals', 'hasattr', 'hash', 'help', 'hex',
  'id', 'input', 'int', 'isinstance', 'issubclass', 'iter', 'len',
  'list', 'locals', 'map', 'max', 'memoryview', 'min', 'next', 'object',
  'oct', 'open', 'ord', 'pow', 'print', 'property', 'range', 'repr',
  'reversed', 'round', 'set', 'setattr', 'slice', 'sorted', 'staticmethod',
  'str', 'sum', 'super', 'tuple', 'type', 'vars', 'zip'
];
