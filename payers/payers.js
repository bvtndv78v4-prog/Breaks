(function () {
  var D = window.PAYERS, state = { lang: "ar", dark: false, tab: "payers", kind: "ri", q: "", open: {} };
  try { state.lang = localStorage.getItem("pay_lang") || "ar"; state.dark = localStorage.getItem("pay_dark") === "1"; } catch (e) {}
  var T = {
    ar: { title: "دليل شركات التأمين", sub: "طرق الاسترداد النقدي، فترات التقديم، والمستندات المطلوبة", ph: "ابحث باسم الشركة أو الكود أو أي كلمة", payers: "شركات التأمين", docs: "المستندات المطلوبة", ri: "طريقة الاسترداد", sb: "التقديم وإعادة التقديم", corp: "تأمين شركات", ind: "تأمين فردي", both: "شركات وأفراد", res: " نتيجة", none: "لا توجد نتائج", copy: "نسخ", copied: "تم ✓", lang: "English", note: "ملاحظات مهمة", doc: "المستندات", arNote: "النص العربي غير متوفر، النص الإنجليزي:" },
    en: { title: "Payer Knowledge Base", sub: "Reimbursement methods, submission windows and required documents", ph: "Search by payer name, code or any word", payers: "Payers", docs: "Required documents", ri: "Reimbursement method", sb: "Submission & resubmission", corp: "Corporate", ind: "Individual", both: "Corporate & Individual", res: " results", none: "No results", copy: "Copy", copied: "Copied ✓", lang: "العربية", note: "Urgent notes", doc: "Documents", arNote: "" }
  };
  var $ = function (id) { return document.getElementById(id); };
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function norm(s) { return String(s || "").toLowerCase().replace(/[\u064b-\u065f\u0640]/g, "").replace(/[أإآ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه"); }
  function hl(text, q) {
    var h = esc(text); if (!q) return h;
    var re = new RegExp("(" + q.split(/\s+/).filter(Boolean).map(function (w) { return esc(w).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }).join("|") + ")", "gi");
    return h.replace(re, "<mark>$1</mark>");
  }
  function pick(p, k, who) { // returns text in current language
    var o = p[k]; if (!o) return "";
    var en = who === "c" ? o.ce : o.ie, ar = who === "c" ? o.ca : o.ia;
    if (state.lang === "en") return en;
    if (ar) return ar;
    var ca = o.ca; if (who === "i" && ca && o.ce === o.ie) return ca;
    return en;
  }
  function blocks(p, k) {
    var t = T[state.lang], o = p[k]; if (!o) return "";
    var c = pick(p, k, "c"), i = pick(p, k, "i"), out = "";
    function blk(h, s) { if (!s) return ""; var ar = /[\u0600-\u06ff]/.test(s.slice(0, 40)); return '<div class="blk"><h3><span>' + h + '</span><button class="cp" type="button">' + t.copy + '</button></h3><div class="txt ' + (ar ? "ar" : "en") + '">' + hl(s, state.q) + "</div></div>"; }
    if (c && c === i) out += blk(t.both, c); else out += blk(t.corp, c) + blk(t.ind, i);
    return '<p class="sec">' + (k === "ri" ? t.ri : t.sb) + "</p>" + out;
  }
  function render() {
    var t = T[state.lang], q = norm(state.q.trim()), L = $("list"), html = "", n = 0;
    document.documentElement.lang = state.lang; document.documentElement.dir = state.lang === "ar" ? "rtl" : "ltr";
    document.body.classList.toggle("dark", state.dark);
    $("title").textContent = t.title; $("sub").textContent = t.sub; $("q").placeholder = t.ph;
    $("langBtn").textContent = t.lang; $("themeBtn").textContent = state.dark ? "☀️" : "🌙";
    $("tabs").innerHTML = ["payers", "docs"].map(function (k) { return '<button type="button" class="chip' + (state.tab === k ? " on active" : "") + '" data-tab="' + k + '">' + t[k] + "</button>"; }).join("");
    $("kinds").innerHTML = "";
    if (state.tab === "payers") {
      D.payers.forEach(function (p, idx) {
        var hay = norm(p.name + " " + p.code + " " + ["ri", "sub"].map(function (k) { var o = p[k]; return o ? [o.ce, o.ie, o.ca, o.ia].join(" ") : ""; }).join(" "));
        if (q && !q.split(/\s+/).every(function (w) { return hay.indexOf(w) > -1; })) return;
        n++;
        var open = state.open["p" + idx] || (q && n <= 3 && q.length > 2);
        html += '<article class="pcard' + (open ? " open" : "") + '" data-k="p' + idx + '"><button class="phead" type="button"><span class="nm">' + hl(p.name, state.q) + "</span>" + (p.code ? '<span class="pcode">#' + esc(p.code) + "</span>" : "") + '<span class="chev">▾</span></button><div class="pbody">' + (open ? blocks(p, "ri") + blocks(p, "sub") : "") + "</div></article>";
      });
    } else {
      D.docs.forEach(function (d, idx) {
        var txt = state.lang === "ar" ? (d.ar || d.en) : d.en;
        var hay = norm(d.type + " " + d.code + " " + d.en + " " + d.ar + " " + d.note);
        if (q && !q.split(/\s+/).every(function (w) { return hay.indexOf(w) > -1; })) return;
        n++;
        var open = state.open["d" + idx] || (q && n <= 3 && q.length > 2);
        var body = "";
        if (open) {
          var ar = state.lang === "ar" && d.ar;
          body = '<div class="blk"><h3><span>' + t.doc + '</span><button class="cp" type="button">' + t.copy + '</button></h3><div class="txt ' + (ar ? "ar" : "en") + '">' + hl(txt, state.q) + "</div></div>";
          if (d.note) body += '<div class="blk"><h3><span>' + t.note + '</span><button class="cp" type="button">' + t.copy + '</button></h3><div class="txt en">' + hl(d.note, state.q) + "</div></div>";
        }
        html += '<article class="pcard' + (open ? " open" : "") + '" data-k="d' + idx + '"><button class="phead" type="button"><span class="nm">' + hl(d.type, state.q) + "</span>" + (d.code ? '<span class="pcode" dir="ltr">' + esc(d.code) + "</span>" : "") + '<span class="chev">▾</span></button><div class="pbody">' + body + "</div></article>";
      });
    }
    $("count").textContent = n + t.res;
    L.innerHTML = html || '<div class="empty">' + t.none + "</div>";
  }
  document.addEventListener("click", function (e) {
    var tb = e.target.closest("[data-tab]"); if (tb) { state.tab = tb.dataset.tab; render(); return; }
    var cp = e.target.closest(".cp");
    if (cp) { var tx = cp.closest(".blk").querySelector(".txt").innerText; var done = function () { cp.textContent = T[state.lang].copied; setTimeout(function () { cp.textContent = T[state.lang].copy; }, 1200); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(tx).then(done, done); else { var a = document.createElement("textarea"); a.value = tx; document.body.appendChild(a); a.select(); try { document.execCommand("copy"); } catch (x) {} a.remove(); done(); } return; }
    var h = e.target.closest(".phead"); if (h) { var k = h.parentNode.dataset.k; state.open[k] = !h.parentNode.classList.contains("open"); render(); }
  });
  $("q").addEventListener("input", function (e) { state.q = e.target.value; render(); });
  $("langBtn").onclick = function () { state.lang = state.lang === "ar" ? "en" : "ar"; try { localStorage.setItem("pay_lang", state.lang); } catch (e) {} render(); };
  $("themeBtn").onclick = function () { state.dark = !state.dark; try { localStorage.setItem("pay_dark", state.dark ? "1" : "0"); } catch (e) {} render(); };
  render();
})();
