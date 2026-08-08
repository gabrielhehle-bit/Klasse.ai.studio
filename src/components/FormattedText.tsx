import React from 'react';

interface FormattedTextProps {
  text: string;
  isDark?: boolean;
}

export function FormattedText({ text, isDark = false }: FormattedTextProps) {
  if (!text) return null;

  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let currentList: React.ReactNode[] = [];
  let inList = false;

  const parseInlineStyles = (lineText: string): React.ReactNode[] => {
    // Process **bold** text in the string
    const parts = lineText.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        const cleanText = part.slice(2, -2);
        return (
          <strong 
            key={index} 
            className={`font-black tracking-tight ${
              isDark 
                ? 'text-white bg-white/10 px-1 rounded' 
                : 'text-slate-950 bg-stone-100 px-1 rounded'
            }`}
          >
            {cleanText}
          </strong>
        );
      }
      return part;
    });
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    // Check if line is a bullet list item
    if (trimmed.startsWith('* ') || trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
      const content = trimmed.substring(2);
      if (!inList) {
        inList = true;
        currentList = [];
      }
      currentList.push(
        <li key={`li-${index}`} className="ml-5 list-disc pl-1 py-1 leading-relaxed">
          {parseInlineStyles(content)}
        </li>
      );
    } else if (/^\d+\.\s/.test(trimmed)) {
      // Check if line is a numbered list item
      const numMatch = trimmed.match(/^(\d+)\.\s(.*)/);
      const content = numMatch ? numMatch[2] : trimmed;
      if (!inList) {
        inList = true;
        currentList = [];
      }
      currentList.push(
        <li key={`li-${index}`} className="ml-5 list-decimal pl-1 py-1 leading-relaxed">
          {parseInlineStyles(content)}
        </li>
      );
    } else {
      // Flush the list if we were in one
      if (inList) {
        elements.push(
          <ul key={`ul-${index}`} className={`space-y-1.5 my-3 ${isDark ? 'text-white' : 'text-slate-800'}`}>
            {currentList}
          </ul>
        );
        inList = false;
        currentList = [];
      }

      // Headers
      if (trimmed.startsWith('### ')) {
        elements.push(
          <h4 key={`h-${index}`} className={`text-[0.6875rem] font-black tracking-widest uppercase mt-5 mb-2 ${
            isDark ? 'text-indigo-300' : 'text-indigo-700'
          }`}>
            {parseInlineStyles(trimmed.substring(4))}
          </h4>
        );
      } else if (trimmed.startsWith('## ')) {
        elements.push(
          <h3 key={`h-${index}`} className={`text-[0.875rem] leading-snug sm:text-[1rem] leading-normal font-black tracking-tight mt-6 mb-2 ${
            isDark ? 'text-white' : 'text-slate-900 border-b border-slate-100 pb-1'
          }`}>
            {parseInlineStyles(trimmed.substring(3))}
          </h3>
        );
      } else if (trimmed.startsWith('# ')) {
        elements.push(
          <h2 key={`h-${index}`} className={`text-[1rem] leading-normal sm:text-[1.125rem] leading-normal font-black tracking-tight mt-8 mb-3 pb-1 border-b ${
            isDark ? 'text-white border-white/10' : 'text-slate-900 border-slate-100'
          }`}>
            {parseInlineStyles(trimmed.substring(2))}
          </h2>
        );
      } else if (trimmed === '') {
        elements.push(<div key={`br-${index}`} className="h-3" />);
      } else {
        elements.push(
          <p key={`p-${index}`} className={`mb-3.5 leading-relaxed ${isDark ? 'text-white' : 'text-slate-800'}`}>
            {parseInlineStyles(line)}
          </p>
        );
      }
    }
  });

  if (inList) {
    elements.push(
      <ul key="ul-end" className={`space-y-1.5 my-3 ${isDark ? 'text-white' : 'text-slate-800'}`}>
        {currentList}
      </ul>
    );
  }

  return (
    <div className="space-y-1 w-full text-left break-words">
      {elements}
    </div>
  );
}
