/* Esutoru Wordmine card script. build.py appends it to both card sides.
   Front: picks one example at random, remembers its index, shows the sentence.
   Back: shows the remembered example with its translation, so the two sides
   agree; picks anew only when nothing was remembered (preview, storage blocked).
   Every review renders the front again, so every review gets a fresh example.
   Wrapped in a function: on the desktop the page lives across cards, and a
   top-level const or let would be declared twice. */
(function () {
  var KEY = "esutoru-wordmine/example";
  var side = document.getElementById("wm-back") ? "back" : "front";
  var wordEl = document.getElementById("wm-word");
  var word = wordEl ? wordEl.textContent : "";

  var examples = [];
  try {
    var data = document.getElementById("wm-examples");
    examples = JSON.parse(data ? data.textContent : "[]");
  } catch (e) {
    examples = [];
  }
  if (!Array.isArray(examples)) { examples = []; }
  examples = examples.filter(function (x) {
    return x && typeof x.target === "string" && x.target !== "";
  });

  /* sessionStorage survives the page reload AnkiDroid does between the two
     sides; on the desktop and AnkiMobile the window object alone would do. */
  var store;
  try {
    sessionStorage.setItem(KEY + "/probe", "1");
    sessionStorage.removeItem(KEY + "/probe");
    store = {
      read: function () { return sessionStorage.getItem(KEY); },
      write: function (value) { sessionStorage.setItem(KEY, value); },
      clear: function () { sessionStorage.removeItem(KEY); }
    };
  } catch (e) {
    store = {
      read: function () { return window.esutoruWordmineExample || null; },
      write: function (value) { window.esutoruWordmineExample = value; },
      clear: function () { window.esutoruWordmineExample = null; }
    };
  }

  var index = -1;
  if (side === "back") {
    try {
      var saved = JSON.parse(store.read());
      if (saved && saved.word === word && typeof saved.index === "number" &&
          saved.index >= 0 && saved.index < examples.length) {
        index = saved.index;
      }
    } catch (e) {}
  }
  if (index < 0 && examples.length > 0) {
    index = Math.floor(Math.random() * examples.length);
  }
  if (side === "front") {
    try {
      store.clear();
      if (index >= 0) { store.write(JSON.stringify({ word: word, index: index })); }
    } catch (e) {}
  }

  var example = index >= 0 ? examples[index] : null;
  var targetEl = document.getElementById("wm-example");
  var sourceEl = document.getElementById("wm-example-translation");
  if (targetEl) { targetEl.innerHTML = example ? example.target : ""; }
  if (sourceEl) {
    sourceEl.innerHTML = example && typeof example.source === "string" ? example.source : "";
  }
})();
