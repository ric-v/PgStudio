(function legacyScriptEntry() {
  const orderedScripts = [
    "js/partials.js",
    "js/core-state.js",
    "js/workbench.js",
    "js/assistant.js",
    "js/tour.js",
    "js/visuals.js",
    "js/bootstrap.js"
  ];

  const load = (index) => {
    if (index >= orderedScripts.length) return;
    const script = document.createElement("script");
    script.src = orderedScripts[index];
    script.onload = () => load(index + 1);
    document.head.appendChild(script);
  };

  load(0);
})();
