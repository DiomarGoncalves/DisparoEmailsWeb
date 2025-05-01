import { fetchWithAuth, showFeedback } from "./script.js";

// Funções relacionadas às mensagens

let quill;

document.addEventListener("DOMContentLoaded", () => {
  quill = new Quill("#editor-container", {
    theme: "snow",
    modules: {
      toolbar: [
        [{ header: [1, 2, false] }],
        ["bold", "italic", "underline"],
        ["image", "link"],
        [{ list: "ordered" }, { list: "bullet" }],
      ],
    },
  });
});
