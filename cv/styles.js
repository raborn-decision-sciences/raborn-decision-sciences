/* The optional styles from the business site (Cyberpunk, Windows 95, Psychometric),
   carried onto these two pages. The choice lives in localStorage under "rds-style", the
   same key the business site's footer picker writes, so a style picked there follows the
   reader here and back. Loaded in the head as a plain script, so the attribute is on
   <html> before the page paints. The rules are in styles.css. */
(function () {
  var STYLES = [["", "Default"], ["cyberpunk", "Cyberpunk"], ["win95", "Windows 95"],
    ["psychometric", "Psychometric"]];
  var root = document.documentElement;
  var saved = "";
  try { saved = localStorage.getItem("rds-style") || ""; } catch (e) { /* storage blocked */ }
  if (!STYLES.some(function (s) { return s[0] === saved; })) saved = "";
  if (saved) root.setAttribute("data-rds-style", saved);

  document.addEventListener("DOMContentLoaded", function () {
    var wrap = document.createElement("div");
    wrap.className = "stylepick";
    var label = document.createElement("label");
    label.setAttribute("for", "stylepick-select");
    label.textContent = "Style";
    var select = document.createElement("select");
    select.id = "stylepick-select";
    STYLES.forEach(function (s) {
      var o = document.createElement("option");
      o.value = s[0]; o.textContent = s[1];
      select.appendChild(o);
    });
    select.value = saved;
    select.addEventListener("change", function () {
      if (select.value) root.setAttribute("data-rds-style", select.value);
      else root.removeAttribute("data-rds-style");
      try {
        if (select.value) localStorage.setItem("rds-style", select.value);
        else localStorage.removeItem("rds-style");
      } catch (e) { /* storage blocked: the choice lasts for this page only */ }
    });
    wrap.appendChild(label);
    wrap.appendChild(select);
    document.body.appendChild(wrap);
  });
})();
