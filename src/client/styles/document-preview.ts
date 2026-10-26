/** Global presentation owned by dsh-enhance (migrated from the installer's injected styles). */
export const css = String.raw`body[data-ds-dark-theme] [data-document-markdown] {
  --md-text: #e9e9e9;
  --md-text-strong: #fff;
  --md-text-muted: #a5a5a5;
  --md-border: rgb(255 255 255 / 11%);
  --md-border-strong: rgb(255 255 255 / 19%);
  --md-accent: #8ab4ff;
  --md-accent-soft: rgb(138 180 255 / 12%);
  --md-heading-1: rgb(231 77 71);
  --md-heading-2: rgb(215 148 64);
  --md-heading-3: rgb(7 170 246);
  --md-heading-4: rgb(163 110 251);
  --md-heading-5: rgb(109 215 215);
  --md-heading-6: rgb(175 191 5);
  --md-code-bg: #0c0c0c;
  --md-code-text: #d9e5ff;
  --md-table-bg: #161616;
  --md-table-head-bg: #222;
  --md-radius-sm: 6px;
  --md-radius-md: 10px;
  --md-content-width: 860px;
}

body:not([data-ds-dark-theme]) [data-document-markdown] {
  --md-text: #242424;
  --md-text-strong: #111;
  --md-text-muted: #5f6368;
  --md-border: rgb(0 0 0 / 12%);
  --md-border-strong: rgb(0 0 0 / 20%);
  --md-accent: #0969da;
  --md-accent-soft: rgb(9 105 218 / 8%);
  --md-heading-1: #c9372c;
  --md-heading-2: #9a5700;
  --md-heading-3: #006b9f;
  --md-heading-4: #7047a8;
  --md-heading-5: #147879;
  --md-heading-6: #626c00;
  --md-code-bg: #f6f8fa;
  --md-code-text: #244a7c;
  --md-table-bg: #fff;
  --md-table-head-bg: #f1f3f5;
}

[data-document-markdown] {
  box-sizing: border-box;
  width: min(100%, var(--md-content-width));
  margin-inline: auto;
  color: var(--md-text) !important;
  font-size: 13px !important;
  line-height: 1.75 !important;
  letter-spacing: .01em;
}

[data-document-markdown] > div {
  max-width: 100%;
  color: var(--md-text) !important;
  font-size: inherit !important;
  line-height: inherit !important;
}

[data-document-markdown] h1,
[data-document-markdown] h2,
[data-document-markdown] h3,
[data-document-markdown] h4,
[data-document-markdown] h5,
[data-document-markdown] h6 {
  padding-bottom: .35em;
  border-bottom: 1px solid var(--md-border);
  line-height: 1.3 !important;
}

[data-document-markdown] h1 {
  margin: 2.2em 0 .8em !important;
  padding-bottom: .45em;
  border-bottom-color: var(--md-border-strong);
  color: var(--md-heading-1) !important;
  font-size: calc(2rem - 2px) !important;
  font-weight: 750 !important;
}

[data-document-markdown] h2 {
  margin: 2em 0 .75em !important;
  color: var(--md-heading-2) !important;
  font-size: calc(1.45rem - 2px) !important;
  font-weight: 720 !important;
}

[data-document-markdown] h3 {
  margin: 1.65em 0 .55em !important;
  border-bottom: 0;
  color: var(--md-heading-3) !important;
  font-size: calc(1.15rem - 2px) !important;
  font-weight: 700 !important;
}

[data-document-markdown] h4,
[data-document-markdown] h5,
[data-document-markdown] h6 {
  margin: 1.3em 0 .45em !important;
  border-bottom: 0;
  font-weight: 680 !important;
}

[data-document-markdown] h4 { color: var(--md-heading-4) !important; }
[data-document-markdown] h5 { color: var(--md-heading-5) !important; }
[data-document-markdown] h6 { color: var(--md-heading-6) !important; }
[data-document-markdown] :is(h1, h2, h3, h4, h5, h6) strong { color: inherit !important; font-weight: inherit !important; }
[data-document-markdown] p { margin: 0 0 1em !important; }
[data-document-markdown] strong { color: var(--md-heading-1) !important; font-weight: 750 !important; }
[data-document-markdown] a,
[data-document-markdown] .fileMention { color: var(--md-accent) !important; text-decoration: none; }
[data-document-markdown] a:hover,
[data-document-markdown] a:focus,
[data-document-markdown] .fileMention:hover,
[data-document-markdown] .fileMention:focus { text-decoration: underline; }
[data-document-markdown] :is(ul, ol) { margin: 1em 0 !important; padding-left: 1.55em; }
[data-document-markdown] li { margin: .38em 0; }
[data-document-markdown] li::marker { color: var(--md-accent); font-weight: 700; }
[data-document-markdown] blockquote {
  margin: 1.25em 0 !important;
  padding: .85em 20px;
  border-left: 1.5px solid var(--md-accent);
  border-radius: 0 var(--md-radius-sm) var(--md-radius-sm) 0;
  background: var(--md-accent-soft);
  color: var(--md-text-muted) !important;
}
[data-document-markdown] .tableScroll { width: 100%; margin: 1.4em 0; }
[data-document-markdown] table {
  width: 100% !important;
  min-width: 0;
  margin: 0;
  border: 1px solid var(--md-border);
  border-radius: var(--md-radius-md);
  border-spacing: 0;
  background: var(--md-table-bg);
  table-layout: auto;
}
[data-document-markdown] thead { background: var(--md-table-head-bg); }
[data-document-markdown] th,
[data-document-markdown] td {
  padding: .75em .9em !important;
  border-right: 1px solid var(--md-border);
  border-bottom: 1px solid var(--md-border);
  text-align: left;
  vertical-align: middle;
  white-space: normal;
  overflow-wrap: anywhere;
}
[data-document-markdown] th { color: var(--md-text-strong); font-weight: 720; }
[data-document-markdown] pre {
  margin: 1.3em 0 !important;
  padding: 1em 20px !important;
  overflow-x: auto;
  border: 1px solid var(--md-border);
  border-radius: var(--md-radius-md);
  background: var(--md-code-bg);
}
[data-document-markdown] :not(pre) > code {
  padding: .16em .4em;
  border: 1px solid var(--md-border);
  border-radius: 5px;
  background: var(--md-code-bg);
  color: var(--md-code-text);
  font-size: .9em !important;
}
[data-document-markdown] hr {
  height: 1px;
  margin: 2.2em 0;
  border: 0;
  background: var(--md-border-strong);
}
[data-document-markdown] img {
  display: block;
  max-width: 100%;
  height: auto;
  margin: 1.25em auto;
  border: 1px solid var(--md-border);
  border-radius: var(--md-radius-md);
}
`
