export class CodeBuilder {
  private lines: string[] = [];
  private indentLevel = 0;

  addLine(line: string): this {
    if (line === '') {
      this.lines.push('');
    } else {
      this.lines.push('    '.repeat(this.indentLevel) + line);
    }
    return this;
  }

  blank(): this {
    this.lines.push('');
    return this;
  }

  indent(): this {
    this.indentLevel++;
    return this;
  }

  dedent(): this {
    this.indentLevel = Math.max(0, this.indentLevel - 1);
    return this;
  }

  toString(): string {
    return this.lines.join('\n');
  }
}
