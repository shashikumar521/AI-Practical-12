import React from 'react';

interface SafeMarkdownProps {
  content: string;
}

function renderInlineSegments(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  // Match inline code (`...`) or bold (**...**) safely without HTML injection
  const tokenRegex = /(`[^`]+`|\*\*[^*]+\*\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let keyIdx = 0;

  while ((match = tokenRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith('`') && token.endsWith('`')) {
      parts.push(
        <code
          key={`code-${keyIdx++}`}
          className="px-1.5 py-0.5 mx-0.5 rounded bg-slate-100 dark:bg-[#0a0e18] border border-slate-200 dark:border-slate-700/60 font-mono text-[0.82em] text-[#005ac2] dark:text-[#4cd7f6]"
        >
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith('**') && token.endsWith('**')) {
      parts.push(
        <strong
          key={`bold-${keyIdx++}`}
          className="font-semibold text-slate-900 dark:text-[#F8FAFC]"
        >
          {token.slice(2, -2)}
        </strong>
      );
    }
    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts;
}

export const SafeMarkdown: React.FC<SafeMarkdownProps> = ({ content }) => {
  const blocks: React.ReactNode[] = [];
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  let i = 0;
  let blockKey = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block
    if (line.trimStart().startsWith('```')) {
      const lang = line.trimStart().slice(3).trim();
      const codeLines: string[] = [];
      i += 1;
      while (i < lines.length && !lines[i].trimStart().startsWith('```')) {
        codeLines.push(lines[i]);
        i += 1;
      }
      i += 1; // skip closing fence
      blocks.push(
        <div
          key={`pre-${blockKey++}`}
          className="my-3 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700/60 bg-slate-900 dark:bg-[#0a0e18]"
        >
          {lang && (
            <div className="px-3 py-1.5 text-[11px] font-mono text-slate-400 border-b border-slate-800 bg-slate-950/60">
              {lang}
            </div>
          )}
          <pre className="p-3.5 overflow-x-auto text-xs leading-relaxed font-mono text-slate-100 dark:text-[#dfe2f1]">
            <code>{codeLines.join('\n')}</code>
          </pre>
        </div>
      );
      continue;
    }

    // Blank line
    if (!line.trim()) {
      i += 1;
      continue;
    }

    // Headings
    const headingMatch = line.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const headingText = headingMatch[2];
      const sizeClass =
        level === 1
          ? 'text-base font-semibold mt-3 mb-1.5'
          : level === 2
          ? 'text-[15px] font-semibold mt-3 mb-1'
          : 'text-sm font-semibold mt-2.5 mb-1';
      blocks.push(
        <h4
          key={`h-${blockKey++}`}
          className={`${sizeClass} font-display text-slate-900 dark:text-[#F8FAFC]`}
        >
          {renderInlineSegments(headingText)}
        </h4>
      );
      i += 1;
      continue;
    }

    // Unordered list
    if (/^\s*[-*•]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*•]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*•]\s+/, ''));
        i += 1;
      }
      blocks.push(
        <ul
          key={`ul-${blockKey++}`}
          className="my-2 space-y-1.5 pl-4 list-disc marker:text-[#3B82F6] dark:marker:text-[#4cd7f6]"
        >
          {items.map((item, idx) => (
            <li key={idx} className="text-[14px] leading-relaxed">
              {renderInlineSegments(item)}
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Ordered list
    if (/^\s*\d+[.)]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+[.)]\s+/, ''));
        i += 1;
      }
      blocks.push(
        <ol
          key={`ol-${blockKey++}`}
          className="my-2 space-y-1.5 pl-5 list-decimal marker:text-[#3B82F6] dark:marker:text-[#adc6ff] marker:font-medium"
        >
          {items.map((item, idx) => (
            <li key={idx} className="text-[14px] leading-relaxed">
              {renderInlineSegments(item)}
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // Paragraph (accumulate consecutive plain lines)
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !lines[i].trimStart().startsWith('```') &&
      !/^(#{1,3})\s+/.test(lines[i]) &&
      !/^\s*[-*•]\s+/.test(lines[i]) &&
      !/^\s*\d+[.)]\s+/.test(lines[i])
    ) {
      paraLines.push(lines[i]);
      i += 1;
    }
    blocks.push(
      <p key={`p-${blockKey++}`} className="my-2 text-[14px] leading-[1.65]">
        {renderInlineSegments(paraLines.join(' '))}
      </p>
    );
  }

  return (
    <div className="text-slate-700 dark:text-[#c2c6d6] break-words [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
      {blocks}
    </div>
  );
};
