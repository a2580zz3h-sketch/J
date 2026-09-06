/* =====================================================================
   TrebEdit — script.js
   Loads a small "site" of files (html/css/js/...), lets you edit them,
   builds a live preview, and streams console output from the preview
   into a slide-in "cache" panel — like watching a script run in a
   terminal.
===================================================================== */

(function () {
  "use strict";

  /* ---------------------------------------------------------------
     1. In-memory project state
  --------------------------------------------------------------- */
  const files = new Map(); // filename -> { content, type }

  const DEFAULT_FILES = {
    "index.html":
`<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>موقعي التجريبي</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <h1>أهلاً بيك في TrebEdit</h1>
  <p>عدّل أي ملف من الشمال وشوف النتيجة هنا فورًا.</p>
  <button id="go">اضغط هنا</button>

  <script src="script.js"><\/script>
</body>
</html>
`,
    "style.css":
`body{
  font-family: system-ui, sans-serif;
  background:#fafaf5;
  color:#1c1c17;
  padding:40px;
  text-align:center;
}
button{
  margin-top:16px;
  padding:10px 18px;
  border:none;
  border-radius:8px;
  background:#6b6f3b;
  color:#fff;
  font-size:15px;
  cursor:pointer;
}
`,
    "script.js":
`console.log("الصفحة اشتغلت تمام");

document.getElementById("go").addEventListener("click", () => {
  console.log("تم الضغط على الزر");
});
`
  };

  let activeFile = "index.html";
  let entryFile = "index.html";

  /* ---------------------------------------------------------------
     2. DOM references
  --------------------------------------------------------------- */
  const fileListEl   = document.getElementById("file-list");
  const activeNameEl = document.getElementById("active-file-name");
  const dirtyDotEl   = document.getElementById("dirty-dot");
  const entrySelect  = document.getElementById("entry-select");
  const uploadBtn    = document.getElementById("upload-btn");
  const uploadInput  = document.getElementById("file-upload");
  const addFileBtn   = document.getElementById("add-file-btn");
  const runBtn       = document.getElementById("run-btn");
  const autoRunBox   = document.getElementById("auto-run");
  const previewFrame = document.getElementById("preview-frame");

  const consoleTab      = document.getElementById("console-tab");
  const consolePanel    = document.getElementById("console-panel");
  const consoleBackdrop = document.getElementById("console-backdrop");
  const consoleBody     = document.getElementById("console-body");
  const consoleClearBtn = document.getElementById("console-clear");
  const consoleCloseBtn = document.getElementById("console-close");

  const workspaceEl  = document.querySelector(".workspace");
  const mobileTabsEl = document.getElementById("mobile-tabs");
  const mobileTabBtns = mobileTabsEl ? [...mobileTabsEl.querySelectorAll(".mobile-tab")] : [];

  function setMobileView(view) {
    if (!workspaceEl) return;
    workspaceEl.dataset.mobileView = view;
    mobileTabBtns.forEach((btn) => btn.classList.toggle("active", btn.dataset.view === view));
    // CodeMirror needs a refresh once its container becomes visible again.
    if (view === "editor") setTimeout(() => editor.refresh(), 0);
  }

  mobileTabBtns.forEach((btn) => {
    btn.addEventListener("click", () => setMobileView(btn.dataset.view));
  });

  /* ---------------------------------------------------------------
     3. CodeMirror editor
  --------------------------------------------------------------- */
  const editor = CodeMirror(document.getElementById("editor-host"), {
    value: "",
    mode: "htmlmixed",
    theme: "neat",
    lineNumbers: true,
    tabSize: 2,
    indentUnit: 2,
    lineWrapping: true,
    autofocus: true
  });

  function modeForFile(name) {
    if (/\.css$/i.test(name)) return "css";
    if (/\.jsx?$/i.test(name)) return "javascript";
    if (/\.(html?|htm)$/i.test(name)) return "htmlmixed";
    if (/\.json$/i.test(name)) return { name: "javascript", json: true };
    return "htmlmixed";
  }

  editor.on("change", () => {
    if (!files.has(activeFile)) return;
    files.get(activeFile).content = editor.getValue();
    setDirty(true);
    if (autoRunBox.checked) scheduleRun();
  });

  let runTimer = null;
  function scheduleRun() {
    clearTimeout(runTimer);
    runTimer = setTimeout(runPreview, 450);
  }

  function setDirty(isDirty) {
    dirtyDotEl.hidden = !isDirty;
  }

  /* ---------------------------------------------------------------
     4. File list rendering / switching
  --------------------------------------------------------------- */
  function renderFileList() {
    fileListEl.innerHTML = "";
    [...files.keys()].sort(sortFiles).forEach((name) => {
      const li = document.createElement("li");
      li.className = name === activeFile ? "active" : "";
      const label = document.createElement("span");
      label.textContent = name;
      li.appendChild(label);

      const removeBtn = document.createElement("button");
      removeBtn.className = "remove-file";
      removeBtn.textContent = "✕";
      removeBtn.title = "حذف الملف";
      removeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        removeFile(name);
      });
      li.appendChild(removeBtn);

      li.addEventListener("click", () => {
        openFile(name);
        setMobileView("editor");
      });
      fileListEl.appendChild(li);
    });
    renderEntryOptions();
  }

  function sortFiles(a, b) {
    const rank = (n) => (n === "index.html" ? 0 : /\.html?$/i.test(n) ? 1 : /\.css$/i.test(n) ? 2 : /\.js$/i.test(n) ? 3 : 4);
    const r = rank(a) - rank(b);
    return r !== 0 ? r : a.localeCompare(b);
  }

  function renderEntryOptions() {
    const htmlFiles = [...files.keys()].filter((n) => /\.html?$/i.test(n));
    entrySelect.innerHTML = "";
    htmlFiles.forEach((n) => {
      const opt = document.createElement("option");
      opt.value = n;
      opt.textContent = n;
      entrySelect.appendChild(opt);
    });
    if (!htmlFiles.includes(entryFile)) entryFile = htmlFiles[0] || "";
    entrySelect.value = entryFile;
  }

  function openFile(name) {
    if (!files.has(name)) return;
    activeFile = name;
    activeNameEl.textContent = name;
    editor.setOption("mode", modeForFile(name));
    editor.setValue(files.get(name).content);
    setDirty(false);
    renderFileList();
  }

  function removeFile(name) {
    if (!files.has(name)) return;
    files.delete(name);
    if (activeFile === name) {
      const next = [...files.keys()][0];
      if (next) openFile(next);
      else {
        activeFile = "";
        activeNameEl.textContent = "—";
        editor.setValue("");
      }
    }
    renderFileList();
  }

  function addFile(name, content = "") {
    if (!name) return;
    if (files.has(name)) {
      logConsole("system", `الملف "${name}" موجود بالفعل`);
      return;
    }
    files.set(name, { content });
    renderFileList();
    openFile(name);
  }

  addFileBtn.addEventListener("click", () => {
    const name = prompt("اسم الملف الجديد (مثال: about.html):");
    if (name && name.trim()) {
      addFile(name.trim());
      setMobileView("editor");
    }
  });

  /* ---------------------------------------------------------------
     5. Uploading a set of site files
  --------------------------------------------------------------- */
  uploadBtn.addEventListener("click", () => uploadInput.click());

  uploadInput.addEventListener("change", async (e) => {
    const list = [...e.target.files];
    if (!list.length) return;

    for (const f of list) {
      const relName = f.webkitRelativePath || f.name;
      const shortName = relName.split("/").pop();
      const content = await readAsText(f);
      files.set(shortName, { content });
    }

    renderFileList();
    const preferredEntry = [...files.keys()].find((n) => n.toLowerCase() === "index.html") ||
                            [...files.keys()].find((n) => /\.html?$/i.test(n));
    if (preferredEntry) {
      entryFile = preferredEntry;
      openFile(preferredEntry);
    }
    logConsole("system", `تم استيراد ${list.length} ملف/ملفات`);
    runPreview();
    setMobileView("editor");
    uploadInput.value = "";
  });

  function readAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

  entrySelect.addEventListener("change", () => {
    entryFile = entrySelect.value;
    runPreview();
  });

  /* ---------------------------------------------------------------
     6. Building the live preview
  --------------------------------------------------------------- */
  const CONSOLE_BRIDGE = `
<script>
(function(){
  function send(level, args){
    try{
      var msg = args.map(function(a){
        if (a instanceof Error) return a.message;
        if (typeof a === "object") { try { return JSON.stringify(a); } catch(e){ return String(a); } }
        return String(a);
      }).join(" ");
      window.parent.postMessage({ __trebedit: true, level: level, message: msg }, "*");
    }catch(e){}
  }
  ["log","info","warn","error"].forEach(function(level){
    var original = console[level] ? console[level].bind(console) : function(){};
    console[level] = function(){
      send(level, Array.prototype.slice.call(arguments));
      original.apply(console, arguments);
    };
  });
  window.addEventListener("error", function(e){
    send("error", [e.message + " (" + (e.filename || "") + ":" + (e.lineno || "") + ")"]);
  });
  window.addEventListener("unhandledrejection", function(e){
    send("error", ["Unhandled promise rejection: " + (e.reason && e.reason.message ? e.reason.message : e.reason)]);
  });
})();
<\/script>`;

  function runPreview() {
    if (!entryFile || !files.has(entryFile)) {
      logConsole("system", "مفيش صفحة بداية HTML اتحددت");
      return;
    }
    let html = files.get(entryFile).content;

    // inline <link rel="stylesheet" href="X">
    html = html.replace(/<link\b[^>]*href=["']([^"']+)["'][^>]*>/gi, (tag, href) => {
      if (!/stylesheet/i.test(tag)) return tag;
      const match = matchFile(href);
      if (!match) return tag;
      return `<style>\n${files.get(match).content}\n</style>`;
    });

    // inline <script src="X"></script>
    html = html.replace(/<script\b[^>]*src=["']([^"']+)["'][^>]*><\/script>/gi, (tag, src) => {
      const match = matchFile(src);
      if (!match) return tag;
      return `<script>\n${files.get(match).content}\n<\/script>`;
    });

    // inject console bridge as early as possible
    if (/<head[^>]*>/i.test(html)) {
      html = html.replace(/<head[^>]*>/i, (m) => `${m}${CONSOLE_BRIDGE}`);
    } else {
      html = CONSOLE_BRIDGE + html;
    }

    clearConsole(true);
    logConsole("system", `تشغيل ${entryFile} …`);
    previewFrame.srcdoc = html;
  }

  function matchFile(refPath) {
    const short = refPath.split("/").pop().split("?")[0].split("#")[0];
    if (files.has(short)) return short;
    const found = [...files.keys()].find((n) => n.toLowerCase() === short.toLowerCase());
    return found || null;
  }

  runBtn.addEventListener("click", () => {
    runPreview();
    setMobileView("preview");
  });

  /* ---------------------------------------------------------------
     7. Console / "cache" panel
  --------------------------------------------------------------- */
  function timestamp() {
    const d = new Date();
    return d.toLocaleTimeString("en-GB", { hour12: false }) + "." + String(d.getMilliseconds()).padStart(3, "0");
  }

  function logConsole(level, message) {
    const line = document.createElement("div");
    line.className = `console-line ${level}`;

    const ts = document.createElement("span");
    ts.className = "ts";
    ts.textContent = `[${timestamp()}]`;

    const tag = document.createElement("span");
    tag.className = "tag";
    tag.textContent = level === "system" ? "$" : level.toUpperCase();

    const msg = document.createElement("span");
    msg.className = "msg";
    msg.textContent = message;

    line.append(ts, tag, msg);
    consoleBody.appendChild(line);
    consoleBody.scrollTop = consoleBody.scrollHeight;
  }

  function clearConsole(silent) {
    consoleBody.innerHTML = "";
    if (!silent) logConsole("system", "تم مسح الكاش");
  }

  window.addEventListener("message", (e) => {
    if (!e.data || !e.data.__trebedit) return;
    logConsole(e.data.level, e.data.message);
  });

  consoleClearBtn.addEventListener("click", () => clearConsole(false));
  consoleCloseBtn.addEventListener("click", closeConsole);
  consoleBackdrop.addEventListener("click", closeConsole);
  consoleTab.addEventListener("click", toggleConsole);

  function toggleConsole() {
    const willOpen = !consolePanel.classList.contains("open");
    consolePanel.classList.toggle("open", willOpen);
    consoleBackdrop.classList.toggle("open", willOpen);
  }
  function closeConsole() {
    consolePanel.classList.remove("open");
    consoleBackdrop.classList.remove("open");
  }

  /* ---------------------------------------------------------------
     8. Keyboard shortcut: Ctrl/Cmd + Enter -> run
  --------------------------------------------------------------- */
  window.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      runPreview();
    }
  });

  /* ---------------------------------------------------------------
     9. Boot with sample project
  --------------------------------------------------------------- */
  Object.entries(DEFAULT_FILES).forEach(([name, content]) => files.set(name, { content }));
  renderFileList();
  openFile("index.html");
  logConsole("system", "TrebEdit جاهز — دوس تشغيل أو استورد ملفات موقعك");
  runPreview();

})();
