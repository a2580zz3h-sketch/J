/* =====================================================================
   TrebEdit — script.js (Fixed & Enhanced)
===================================================================== */

(function () {
  "use strict";

  /* ---------------------------------------------------------------
     1. In-memory project state
  --------------------------------------------------------------- */
  const files = new Map(); // filename -> { content }

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

  const pasteBtn       = document.getElementById("paste-btn");
  const pasteBackdrop  = document.getElementById("paste-backdrop");
  const pasteModal     = document.getElementById("paste-modal");
  const pasteClose     = document.getElementById("paste-close");
  const pasteFilename  = document.getElementById("paste-filename");
  const pasteTextarea  = document.getElementById("paste-textarea");
  const pasteSubmit    = document.getElementById("paste-submit");
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

  /* ---------------------------------------------------------------
     3. Mobile view switching
  --------------------------------------------------------------- */
  function setMobileView(view) {
    if (!workspaceEl) return;
    workspaceEl.dataset.mobileView = view;
    mobileTabBtns.forEach((btn) => btn.classList.toggle("active", btn.dataset.view === view));
    if (view === "editor") setTimeout(() => editor.refresh(), 50);
  }

  mobileTabBtns.forEach((btn) => {
    btn.addEventListener("click", () => setMobileView(btn.dataset.view));
  });

  /* ---------------------------------------------------------------
     4. CodeMirror editor
  --------------------------------------------------------------- */
  const editor = CodeMirror(document.getElementById("editor-host"), {
    value: "",
    mode: "htmlmixed",
    theme: "neat",
    lineNumbers: true,
    tabSize: 2,
    indentUnit: 2,
    lineWrapping: true,
    autofocus: false,
    extraKeys: {
      "Ctrl-Space": "autocomplete",
      "Tab": function(cm) {
        if (cm.somethingSelected()) {
          cm.indentSelection("add");
        } else {
          cm.replaceSelection("  ", "end");
        }
      }
    }
  });

  function modeForFile(name) {
    if (/\.css$/i.test(name)) return "css";
    if (/\.jsx?$/i.test(name)) return "javascript";
    if (/\.(html?|htm)$/i.test(name)) return "htmlmixed";
    if (/\.json$/i.test(name)) return { name: "javascript", json: true };
    if (/\.(xml|svg)$/i.test(name)) return "xml";
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
     5. File list rendering / switching
  --------------------------------------------------------------- */
  function renderFileList() {
    fileListEl.innerHTML = "";
    [...files.keys()].sort(sortFiles).forEach((name) => {
      const li = document.createElement("li");
      li.className = name === activeFile ? "active" : "";
      li.title = name;
      
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
    // Ensure editor refreshes after layout changes
    setTimeout(() => editor.refresh(), 10);
  }

  function removeFile(name) {
    if (!files.has(name)) return;
    files.delete(name);
    if (activeFile === name) {
      const remaining = [...files.keys()].sort(sortFiles);
      const next = remaining[0];
      if (next) openFile(next);
      else {
        activeFile = "";
        activeNameEl.textContent = "—";
        editor.setValue("");
        setDirty(false);
      }
    }
    renderFileList();
  }

  function addFile(name, content = "") {
    if (!name) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    if (files.has(trimmed)) {
      logConsole("system", `الملف "${trimmed}" موجود بالفعل`);
      openFile(trimmed);
      return;
    }
    files.set(trimmed, { content });
    renderFileList();
    openFile(trimmed);
  }

  addFileBtn.addEventListener("click", () => {
    const name = prompt("اسم الملف الجديد (مثال: about.html):");
    if (name && name.trim()) {
      addFile(name.trim());
      setMobileView("editor");
    }
  });

  /* ---------------------------------------------------------------
     6. File Upload (with webkitdirectory support + Drag & Drop)
  --------------------------------------------------------------- */
  uploadBtn.addEventListener("click", () => uploadInput.click());

  uploadInput.addEventListener("change", async (e) => {
    const list = [...e.target.files];
    if (!list.length) return;
    await importFileList(list);
    uploadInput.value = "";
  });

  async function importFileList(list) {
    let count = 0;
    for (const f of list) {
      try {
        const relName = f.webkitRelativePath || f.name;
        // For flat structure, use filename only. 
        // If webkitRelativePath exists (folder drop), preserve last segment.
        const shortName = relName.split("/").pop();
        const content = await readAsText(f);
        files.set(shortName, { content });
        count++;
      } catch (err) {
        logConsole("error", `فشل قراءة "${f.name}": ${err.message}`);
      }
    }
    if (count > 0) {
      finishImport(count, "استيراد");
    }
  }

  function finishImport(count, sourceLabel) {
    renderFileList();
    const preferredEntry = [...files.keys()].find((n) => n.toLowerCase() === "index.html") ||
                            [...files.keys()].find((n) => /\.html?$/i.test(n));
    if (preferredEntry) {
      entryFile = preferredEntry;
      openFile(preferredEntry);
    }
    logConsole("system", `تم استيراد ${count} ملف/ملفات (${sourceLabel})`);
    runPreview();
    setMobileView("editor");
  }

  /* ---------------------------------------------------------------
     6b. Drag & Drop support
  --------------------------------------------------------------- */
  const dropOverlay = document.createElement("div");
  dropOverlay.className = "drop-overlay";
  dropOverlay.innerHTML = "<span>أفلت الملفات هنا</span>";
  document.body.appendChild(dropOverlay);

  let dragCounter = 0;

  window.addEventListener("dragenter", (e) => {
    e.preventDefault();
    dragCounter++;
    if (e.dataTransfer.types.includes("Files")) {
      dropOverlay.classList.add("active");
    }
  });

  window.addEventListener("dragleave", (e) => {
    e.preventDefault();
    dragCounter--;
    if (dragCounter === 0) {
      dropOverlay.classList.remove("active");
    }
  });

  window.addEventListener("dragover", (e) => {
    e.preventDefault();
  });

  window.addEventListener("drop", async (e) => {
    e.preventDefault();
    dragCounter = 0;
    dropOverlay.classList.remove("active");
    
    const items = e.dataTransfer.items;
    const fileList = [];
    
    if (items) {
      const promises = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === "file") {
          if (item.webkitGetAsEntry) {
            const entry = item.webkitGetAsEntry();
            if (entry) {
              promises.push(traverseEntry(entry, fileList));
            }
          } else {
            const file = item.getAsFile();
            if (file) fileList.push(file);
          }
        }
      }
      await Promise.all(promises);
    } else {
      const files = e.dataTransfer.files;
      if (files) fileList.push(...files);
    }
    
    if (fileList.length) {
      await importFileList(fileList);
    }
  });

  function traverseEntry(entry, fileList) {
    return new Promise((resolve) => {
      if (entry.isFile) {
        entry.file((file) => {
          // Preserve relative path in webkitRelativePath-like property
          Object.defineProperty(file, 'webkitRelativePath', {
            value: entry.fullPath.substring(1),
            writable: false
          });
          fileList.push(file);
          resolve();
        }, () => resolve());
      } else if (entry.isDirectory) {
        const reader = entry.createReader();
        reader.readEntries(async (entries) => {
          for (const e of entries) {
            await traverseEntry(e, fileList);
          }
          resolve();
        }, () => resolve());
      } else {
        resolve();
      }
    });
  }

  /* ---------------------------------------------------------------
     6c. Paste-code import
  --------------------------------------------------------------- */
  function openPasteModal() {
    pasteBackdrop.classList.add("open");
    pasteModal.classList.add("open");
    pasteTextarea.focus();
  }
  function closePasteModal() {
    pasteBackdrop.classList.remove("open");
    pasteModal.classList.remove("open");
  }

  pasteBtn.addEventListener("click", openPasteModal);
  pasteClose.addEventListener("click", closePasteModal);
  pasteBackdrop.addEventListener("click", closePasteModal);

  function parseMultiFileText(raw) {
    const markerRe = /^###\s+(.+?)\s*$/m;
    const lines = raw.split(/\r?\n/);
    const result = [];
    let currentName = null;
    let currentLines = [];
    
    lines.forEach((line) => {
      const m = line.match(/^###\s+(.+?)\s*$/);
      if (m) {
        if (currentName) {
          result.push({ name: currentName, content: currentLines.join("\n").trim() });
        }
        currentName = m[1].trim();
        currentLines = [];
      } else if (currentName !== null) {
        currentLines.push(line);
      }
    });
    
    if (currentName) {
      result.push({ name: currentName, content: currentLines.join("\n").trim() });
    }
    return result;
  }

  pasteSubmit.addEventListener("click", () => {
    const raw = pasteTextarea.value;
    if (!raw.trim()) return;

    const parsed = parseMultiFileText(raw);
    let count = 0;

    if (parsed.length > 0) {
      parsed.forEach(({ name, content }) => {
        files.set(name, { content });
        count++;
      });
    } else {
      const name = (pasteFilename.value || "").trim() || "index.html";
      files.set(name, { content: raw });
      count = 1;
    }

    finishImport(count, "لصق");
    pasteTextarea.value = "";
    closePasteModal();
  });

  /* ---------------------------------------------------------------
     6d. Native bridge for Android/WebView
  --------------------------------------------------------------- */
  window.trebeditImportFiles = function (list) {
    try {
      const parsed = typeof list === "string" ? JSON.parse(list) : list;
      if (!Array.isArray(parsed)) throw new Error("expected an array of {name, content}");
      parsed.forEach((f) => { 
        if (f && f.name) files.set(f.name, { content: f.content || "" }); 
      });
      finishImport(parsed.length, "من التطبيق");
    } catch (err) {
      logConsole("error", "trebeditImportFiles: " + err.message);
    }
  };

  function readAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsText(file);
    });
  }

  entrySelect.addEventListener("change", () => {
    entryFile = entrySelect.value;
    runPreview();
  });

  /* ---------------------------------------------------------------
     7. Building the live preview
  --------------------------------------------------------------- */
  const CONSOLE_BRIDGE = `
<script>
(function(){
  function send(level, args){
    try{
      var msg = args.map(function(a){
        if (a instanceof Error) return a.stack || a.message;
        if (typeof a === "object") { try { return JSON.stringify(a, null, 2); } catch(e){ return String(a); } }
        return String(a);
      }).join(" ");
      window.parent.postMessage({ __trebedit: true, level: level, message: msg }, "*");
    }catch(e){}
  }
  ["log","info","warn","error","debug"].forEach(function(level){
    var original = console[level] ? console[level].bind(console) : function(){};
    console[level] = function(){
      send(level, Array.prototype.slice.call(arguments));
      original.apply(console, arguments);
    };
  });
  window.addEventListener("error", function(e){
    send("error", [e.message + " (" + (e.filename || "") + ":" + (e.lineno || "") + ":" + (e.colno || "") + ")"]);
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

    // Inline <link rel="stylesheet" href="X">
    html = html.replace(/<link\b([^>]*)href=["']([^"']+)["']([^>]*)>/gi, (tag, before, href, after) => {
      if (!/stylesheet/i.test(tag)) return tag;
      const match = matchFile(href);
      if (!match) return tag;
      return `<style>\n${files.get(match).content}\n</style>`;
    });

    // Inline <script src="X"></script>
    html = html.replace(/<script\b([^>]*)src=["']([^"']+)["']([^>]*)><\/script>/gi, (tag, before, src, after) => {
      const match = matchFile(src);
      if (!match) return tag;
      return `<script${before}${after}>\n${files.get(match).content}\n<\/script>`;
    });

    // Inject console bridge as early as possible
    if (/<head[^>]*>/i.test(html)) {
      html = html.replace(/<head[^>]*>/i, (m) => `${m}${CONSOLE_BRIDGE}`);
    } else if (/<html[^>]*>/i.test(html)) {
      html = html.replace(/<html[^>]*>/i, (m) => `${m}<head>${CONSOLE_BRIDGE}</head>`);
    } else {
      html = CONSOLE_BRIDGE + html;
    }

    clearConsole(true);
    logConsole("system", `تشغيل ${entryFile} …`);
    
    try {
      previewFrame.srcdoc = html;
    } catch (err) {
      logConsole("error", "فشل تحميل المعاينة: " + err.message);
    }
  }

  function matchFile(refPath) {
    const clean = refPath.split("?")[0].split("#")[0];
    const short = clean.split("/").pop();
    if (files.has(clean)) return clean;
    if (files.has(short)) return short;
    const found = [...files.keys()].find((n) => n.toLowerCase() === short.toLowerCase());
    return found || null;
  }

  runBtn.addEventListener("click", () => {
    runPreview();
    setMobileView("preview");
  });

  /* ---------------------------------------------------------------
     8. Console panel
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
    if (!silent) logConsole("system", "تم مسح الكونسول");
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
     9. Keyboard shortcuts
  --------------------------------------------------------------- */
  window.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      runPreview();
      if (window.innerWidth <= 700) setMobileView("preview");
    }
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault();
      // Trigger run to "save" state
      runPreview();
      logConsole("system", "تم حفظ الحالة وتشغيل المعاينة");
    }
  });

  /* ---------------------------------------------------------------
     10. Boot with sample project
  --------------------------------------------------------------- */
  Object.entries(DEFAULT_FILES).forEach(([name, content]) => files.set(name, { content }));
  renderFileList();
  openFile("index.html");
  logConsole("system", "TrebEdit جاهز — دوس تشغيل أو استورد ملفات موقعك");
  runPreview();

})();
