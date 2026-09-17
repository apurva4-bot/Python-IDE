const editor = document.querySelector("#editor");
const highlight = document.querySelector("#highlight code");
const output = document.querySelector("#output");
const cursor = document.querySelector("#cursor-position");
const pairs = { "(": ")", "[": "]", "{": "}", '"': '"', "'": "'" };

function paint() {
  highlight.innerHTML = Prism.highlight(editor.value + "\n", Prism.languages.python, "python");
}

function updateCursor() {
  const before = editor.value.slice(0, editor.selectionStart);
  cursor.textContent = `Ln ${before.split("\n").length}, Col ${before.split("\n").at(-1).length + 1}`;
}

editor.addEventListener("input", () => { paint(); updateCursor(); });
editor.addEventListener("scroll", () => { highlight.parentElement.scrollTop = editor.scrollTop; highlight.parentElement.scrollLeft = editor.scrollLeft; });
editor.addEventListener("click", updateCursor);
editor.addEventListener("keyup", updateCursor);
editor.addEventListener("keydown", (event) => {
  if (event.key === "Tab") {
    event.preventDefault();
    const start = editor.selectionStart;
    editor.setRangeText("    ", start, editor.selectionEnd, "end");
    paint();
  }
  if (pairs[event.key]) {
    const next = editor.value[editor.selectionStart];
    if (next === pairs[event.key]) { event.preventDefault(); editor.selectionStart = editor.selectionEnd += 1; return; }
    event.preventDefault();
    const start = editor.selectionStart;
    editor.setRangeText(event.key + pairs[event.key], start, editor.selectionEnd, "end");
    editor.selectionStart = editor.selectionEnd = start + 1;
    paint();
  }
  if (event.key === "Enter") {
    const line = editor.value.slice(0, editor.selectionStart).split("\n").at(-1);
    const indent = line.match(/^\s*/)[0];
    const extra = /(?:\b(def|if|for|while|class|try|else|elif|with|except|finally)\b.*:|:\s*)$/.test(line) ? "    " : "";
    event.preventDefault();
    const start = editor.selectionStart;
    editor.setRangeText("\n" + indent + extra, start, editor.selectionEnd, "end");
    paint();
  }
});

document.querySelector("#run-button").addEventListener("click", async () => {
  output.textContent = "Running...";
  const response = await fetch("/run", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: editor.value }) });
  const result = await response.json();
  output.textContent = result.output || (result.code === 0 ? "Program finished without output." : "Program failed.");
});
document.querySelector("#clear-button").addEventListener("click", () => { output.textContent = ""; });
paint();
updateCursor();