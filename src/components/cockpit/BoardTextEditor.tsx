import React, { useEffect, useRef, useState } from "react";

type BoardTextEditorProps = {
  value: string;
  active: boolean;
  onChange: (html: string) => void;
  onDone: () => void;
  externalToolbar?: boolean;
  commandRef?: React.MutableRefObject<((command: string, argument?: string) => void) | null>;
};

const ALLOWED_TAGS = new Set([
  "DIV",
  "P",
  "BR",
  "B",
  "STRONG",
  "I",
  "EM",
  "U",
  "UL",
  "OL",
  "LI",
  "H1",
  "H2",
  "H3",
  "BLOCKQUOTE",
  "SPAN",
]);

const sanitizeStyle = (value: string) =>
  value
    .split(";")
    .map((part) => part.trim())
    .filter((part) => /^text-align\s*:\s*(left|center|right|justify)$/i.test(part) || /^color\s*:\s*(#[0-9a-f]{3,8}|rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\))$/i.test(part))
    .join("; ");

export function sanitizeBoardTextHtml(html: string): string {
  if (typeof document === "undefined") return html;

  const template = document.createElement("template");
  template.innerHTML = html;

  const cleanNode = (node: Node) => {
    [...node.childNodes].forEach((child) => {
      if (child.nodeType === Node.COMMENT_NODE) {
        child.remove();
        return;
      }
      if (child.nodeType !== Node.ELEMENT_NODE) return;

      const element = child as HTMLElement;
      if (!ALLOWED_TAGS.has(element.tagName)) {
        const text = document.createTextNode(element.textContent || "");
        element.replaceWith(text);
        return;
      }

      [...element.attributes].forEach((attribute) => {
        if (attribute.name !== "style") {
          element.removeAttribute(attribute.name);
          return;
        }
        const safeStyle = sanitizeStyle(attribute.value);
        if (safeStyle) element.setAttribute("style", safeStyle);
        else element.removeAttribute("style");
      });

      cleanNode(element);
    });
  };

  cleanNode(template.content);
  return template.innerHTML;
}

export function BoardTextEditor({
  value,
  active,
  onChange,
  onDone,
  externalToolbar = false,
  commandRef,
}: BoardTextEditorProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const pendingSave = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestHtml = useRef(sanitizeBoardTextHtml(value || ""));
  const [isEmpty, setIsEmpty] = useState(!latestHtml.current.replace(/<[^>]*>/g, "").trim());
  const [clearArmed, setClearArmed] = useState(false);

  const flush = () => {
    if (pendingSave.current) {
      clearTimeout(pendingSave.current);
      pendingSave.current = null;
    }
    onChange(latestHtml.current);
  };

  const scheduleSave = (html: string) => {
    latestHtml.current = sanitizeBoardTextHtml(html);
    setIsEmpty(!latestHtml.current.replace(/<[^>]*>/g, "").trim());
    if (pendingSave.current) clearTimeout(pendingSave.current);
    pendingSave.current = setTimeout(() => {
      pendingSave.current = null;
      onChange(latestHtml.current);
    }, 250);
  };

  useEffect(() => {
    const sanitized = sanitizeBoardTextHtml(value || "");
    latestHtml.current = sanitized;
    setIsEmpty(!sanitized.replace(/<[^>]*>/g, "").trim());
    if (editorRef.current && editorRef.current.innerHTML !== sanitized) {
      editorRef.current.innerHTML = sanitized;
    }
  }, [value]);

  useEffect(
    () => () => {
      if (pendingSave.current) clearTimeout(pendingSave.current);
    },
    [],
  );

  useEffect(() => {
    if (!active) setClearArmed(false);
  }, [active]);

  const runCommand = (command: string, argument?: string) => {
    editorRef.current?.focus();
    if (command === "foreColor") document.execCommand("styleWithCSS", false, "true");
    document.execCommand(command, false, argument);
    if (editorRef.current) scheduleSave(editorRef.current.innerHTML);
  };

  useEffect(() => {
    if (!commandRef) return;
    commandRef.current = runCommand;
    return () => { commandRef.current = null; };
  }, [commandRef, runCommand]);

  const buttonClass =
    "min-h-11 px-3 rounded-lg border border-slate-200 bg-white text-slate-800 text-sm font-semibold hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600";

  return (
    <>
      <div
        ref={editorRef}
        contentEditable={active}
        suppressContentEditableWarning
        role="textbox"
        aria-label="Text auf der weißen Unterrichtsfläche"
        aria-multiline="true"
        spellCheck
        onInput={(event) => scheduleSave(event.currentTarget.innerHTML)}
        onBlur={() => {
          if (active) flush();
        }}
        onPaste={(event) => {
          event.preventDefault();
          const plainText = event.clipboardData.getData("text/plain");
          document.execCommand("insertText", false, plainText);
        }}
        className={`absolute inset-0 overflow-auto bg-transparent px-[7%] py-[6%] text-slate-950 outline-none
          [&_h1]:text-4xl [&_h1]:font-bold [&_h1]:mb-4
          [&_h2]:text-3xl [&_h2]:font-bold [&_h2]:mb-3
          [&_h3]:text-2xl [&_h3]:font-semibold [&_h3]:mb-2
          [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-7 [&_ol]:list-decimal [&_ol]:pl-7
          ${active ? "z-[5] pointer-events-auto cursor-text select-text" : "z-[1] pointer-events-none select-text"}`}
      />

      {active && isEmpty && (
        <div className="absolute left-[7%] top-[6%] z-[6] pointer-events-none text-slate-300 text-2xl font-medium">
          Hier schreiben …
        </div>
      )}

      {active && !externalToolbar && (
        <div
          className="absolute left-1/2 top-3 z-[21000] -translate-x-1/2 max-w-[calc(100%-1.5rem)] flex flex-wrap items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-xl backdrop-blur"
          role="toolbar"
          aria-label="Text formatieren"
        >
          <select
            aria-label="Textformat"
            defaultValue="p"
            onChange={(event) => runCommand("formatBlock", event.target.value)}
            className={buttonClass}
          >
            <option value="p">Text</option>
            <option value="h1">Titel</option>
            <option value="h2">Überschrift</option>
            <option value="h3">Zwischenüberschrift</option>
          </select>
          <button type="button" className={buttonClass} onClick={() => runCommand("bold")} aria-label="Fett">
            <strong>B</strong>
          </button>
          <button type="button" className={buttonClass} onClick={() => runCommand("italic")} aria-label="Kursiv">
            <em>I</em>
          </button>
          <button type="button" className={buttonClass} onClick={() => runCommand("underline")} aria-label="Unterstrichen">
            <u>U</u>
          </button>
          <button type="button" className={buttonClass} onClick={() => runCommand("justifyLeft")}>Links</button>
          <button type="button" className={buttonClass} onClick={() => runCommand("justifyCenter")}>Mitte</button>
          <button type="button" className={buttonClass} onClick={() => runCommand("justifyRight")}>Rechts</button>
          <button type="button" className={buttonClass} onClick={() => runCommand("insertUnorderedList")}>Liste</button>
          <button type="button" className={buttonClass} onClick={() => runCommand("insertOrderedList")}>1. Liste</button>
          <button type="button" className={buttonClass} onClick={() => runCommand("undo")}>Rückgängig</button>
          <button type="button" className={buttonClass} onClick={() => runCommand("redo")}>Wiederholen</button>
          <button
            type="button"
            className={clearArmed ? "min-h-11 px-3 rounded-lg bg-rose-600 text-white text-sm font-semibold" : buttonClass}
            onClick={() => {
              if (!clearArmed) {
                setClearArmed(true);
                return;
              }
              setClearArmed(false);
              if (editorRef.current) editorRef.current.innerHTML = "";
              scheduleSave("");
            }}
          >
            {clearArmed ? "Wirklich löschen" : "Text löschen"}
          </button>
          {clearArmed && (
            <button type="button" className={buttonClass} onClick={() => setClearArmed(false)}>
              Abbrechen
            </button>
          )}
          <button
            type="button"
            className="min-h-11 px-4 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-500"
            onClick={() => {
              flush();
              onDone();
            }}
          >
            Fertig
          </button>
        </div>
      )}
    </>
  );
}
