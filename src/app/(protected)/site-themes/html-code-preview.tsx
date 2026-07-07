"use client";

type HtmlCodePreviewProps = {
  htmlCode: string;
  cssCode?: string;
  jsCode?: string;
  title?: string;
  minHeight?: number;
};

export function htmlPreviewDocument({
  htmlCode,
  cssCode = "",
  jsCode = "",
  title = "Vendero theme preview",
}: HtmlCodePreviewProps) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title.replace(/[<>]/g, "")}</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #ffffff; color: #0f172a; }
    img { max-width: 100%; display: block; }
    button, input, select, textarea { font: inherit; }
    ${cssCode}
  </style>
</head>
<body>
${htmlCode}
<script>
try {
${jsCode}
} catch (error) {
  document.body.insertAdjacentHTML("beforeend", '<pre style="margin:16px;padding:12px;border:1px solid #fecdd3;background:#fff1f2;color:#9f1239;white-space:pre-wrap;font:12px ui-monospace, SFMono-Regular, Menlo, monospace;">' + String(error && error.message ? error.message : error) + '</pre>');
}
</script>
</body>
</html>`;
}

export function HtmlCodePreview({
  htmlCode,
  cssCode = "",
  jsCode = "",
  title,
  minHeight = 360,
}: HtmlCodePreviewProps) {
  const hasCode = htmlCode.trim() || cssCode.trim() || jsCode.trim();

  if (!hasCode) {
    return (
      <div
        className="grid place-items-center rounded-lg border border-dashed border-border bg-background/40 p-8 text-center text-sm text-muted-foreground"
        style={{ minHeight }}
      >
        Add HTML, CSS, or JS to see a code preview here.
      </div>
    );
  }

  return (
    <iframe
      title={title ?? "HTML code preview"}
      className="w-full rounded-lg border border-border bg-white"
      sandbox="allow-scripts"
      srcDoc={htmlPreviewDocument({ htmlCode, cssCode, jsCode, title })}
      style={{ minHeight }}
    />
  );
}
