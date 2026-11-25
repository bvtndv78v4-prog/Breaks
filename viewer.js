(function () {
  "use strict";
  var TEAMS = ["Allianz", "WA", "Hotline"];
  var state = {
    q: "", team: "", view: "p", data: null,
    lang: null, dark: null
  };
  try {
    state.lang = localStorage.getItem("breaks_lang") || "ar";
    state.dark = localStorage.getItem("breaks_dark") === "1";
  } catch (e) { state.lang = "ar"; state.dark = false; }

  var I18N = {
    ar: {
      all: "الكل", people: "Personal breaks", full: "Full schedule",
      employees: "Employees", breaks: "Breaks", teams: "Teams",
      results: "results", slots: "وقت",
      noResult: "مفيش نتيجة. جرّب جزء تاني من الاسم.",
      noBreak: "مفيش بريك متسجل", noShift: "الشيفت مش متسجل",
      shiftIs: "الشيفت ", shiftTo: " لـ ", min: "min",
      searchPh: "ابحث بالاسم أو كود HR",
      daySub: "بريكات Teams Allianz وWA وHotline",
      updatedPre: "آخر تحديث للبيانات: ",
      updatedPost: " بتوقيت القاهرة. أي تحديث جديد بيظهر هنا أول ما يتسجّل.",
      dlExcel: "⬇ Excel", dlImage: "Image",
      themeToDark: "الوضع الليلي", themeToLight: "الوضع النهاري",
      langBtn: "English",
      unavailable: "البيانات مش متاحة دلوقتي. جرّب تاني بعد شوية.",
      defaultTitle: "جدول البريكات",
      hName: "الاسم", hHR: "كود HR", hTeam: "الفريق", hShift: "الشيفت",
      hBreak: "بريك ", hTotal: "إجمالي البريك (دقيقة)",
      hTime: "الوقت", hEmployee: "الموظف", hDur: "المدة (دقيقة)",
      sheetPeople: "بريكات الأفراد", sheetFull: "الجدول الكامل"
    },
    en: {
      all: "All", people: "Personal breaks", full: "Full schedule",
      employees: "Employees", breaks: "Breaks", teams: "Teams",
      results: "results", slots: "slots",
      noResult: "No match. Try another part of the name.",
      noBreak: "No break recorded", noShift: "shift not recorded",
      shiftIs: "Shift ", shiftTo: " to ", min: "m",
      searchPh: "Search by name or HR code",
      daySub: "Breaks for the Allianz, WA and Hotline teams",
      updatedPre: "Data last updated: ",
      updatedPost: " Cairo time. New updates appear here as soon as they are published.",
      dlExcel: "⬇ Excel", dlImage: "Image",
      themeToDark: "Dark mode", themeToLight: "Light mode",
      langBtn: "عربي",
      unavailable: "Data is not available right now. Please try again soon.",
      defaultTitle: "Breaks Schedule",
      hName: "Name", hHR: "HR Code", hTeam: "Team", hShift: "Shift",
      hBreak: "Break ", hTotal: "Total break (min)",
      hTime: "Time", hEmployee: "Employee", hDur: "Duration (min)",
      sheetPeople: "Personal breaks", sheetFull: "Full schedule"
    }
  };
  function T() { return I18N[state.lang]; }
  function loc() { return state.lang === "ar" ? "ar-EG-u-nu-latn" : "en-GB"; }
  function fmt(n) { return Number(n).toLocaleString("en-US"); }

  function norm(s) {
    return (s || "").toLowerCase()
      .replace(/[ً-ٰٕ]/g, "")
      .replace(/[أإآٱ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي")
      .replace(/[٠-٩]/g, function (d) { return String(d.charCodeAt(0) - 1632); })
      .replace(/\s+/g, " ").trim();
  }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function match(name, hr, terms) {
    var hay = norm(name + " " + hr);
    return terms.every(function (t) { return hay.indexOf(t) !== -1; });
  }
  function toMin(tm) { var p = String(tm).split(":"); return (+p[0]) * 60 + (+p[1]); }
  function shiftMap() {
    var m = {};
    state.data.employees.forEach(function (r) { m[r[0]] = (r[2] && r[3]) ? toMin(r[2]) : null; });
    return m;
  }
  function adjMin(timeMin, sStart) {
    return (sStart != null && timeMin < sStart) ? timeMin + 1440 : timeMin;
  }
  function nowMinutes() {
    if (!state.data || !state.data.meta || !state.data.meta.date) return null;
    var o = {};
    try {
      new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Cairo", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date()).forEach(function (p) { o[p.type] = p.value; });
    } catch (e) { return null; }
    if (o.year + "-" + o.month + "-" + o.day !== state.data.meta.date) return null;
    var h = +o.hour; if (h === 24) h = 0;
    return h * 60 + (+o.minute);
  }

  function title() {
    var d = state.data;
    var cfg = (window.SITE_CONFIG && window.SITE_CONFIG.title) || I18N.ar.defaultTitle;
    var t = (d && d.title) || cfg;
    if (state.lang === "en" && t === I18N.ar.defaultTitle) return I18N.en.defaultTitle;
    return t;
  }

  function applyChrome() {
    var t = T();
    document.documentElement.lang = state.lang;
    document.documentElement.dir = state.lang === "ar" ? "rtl" : "ltr";
    document.body.classList.toggle("dark", !!state.dark);
    document.title = title();
    document.getElementById("title").textContent = title();
    document.getElementById("q").placeholder = t.searchPh;
    var themeBtn = document.getElementById("themeBtn");
    themeBtn.textContent = state.dark ? "☀️" : "🌙";
    themeBtn.setAttribute("aria-label", state.dark ? t.themeToLight : t.themeToDark);
    themeBtn.title = state.dark ? t.themeToLight : t.themeToDark;
    document.getElementById("langBtn").textContent = t.langBtn;
    document.getElementById("xlsBtn").textContent = "\u2b07 Excel \u00b7 Times";
    document.getElementById("imgBtnLbl").textContent = "Image \u00b7 Times";
    document.getElementById("pxlsBtn").textContent = "\u2b07 Excel \u00b7 People";
    document.getElementById("pimgBtn").textContent = "\u2b07 Image \u00b7 People";
  }

  function renderChips() {
    var t = T();
    var teams = document.getElementById("teams");
    teams.innerHTML = "";
    [{ v: "", l: t.all }].concat(TEAMS.map(function (g) { return { v: g, l: g }; })).forEach(function (o) {
      var b = el("button", "chip" + (state.team === o.v ? " on" : ""), o.l);
      b.onclick = function () { state.team = o.v; renderChips(); renderList(); };
      teams.appendChild(b);
    });
    var views = document.getElementById("views");
    views.innerHTML = "";
    [{ v: "p", l: t.people }, { v: "f", l: t.full }].forEach(function (o) {
      var b = el("button", "chip" + (state.view === o.v ? " on" : ""), o.l);
      b.onclick = function () { state.view = o.v; renderChips(); renderList(); };
      views.appendChild(b);
    });
  }

  function renderStats(d) {
    var t = T();
    var s = document.getElementById("stats");
    s.innerHTML = "";
    [[t.employees, d.employees.length], [t.breaks, d.breaks.length], [t.teams, TEAMS.length]].forEach(function (p) {
      var box = el("div", "stat");
      box.appendChild(el("b", null, fmt(p[1])));
      box.appendChild(el("span", null, p[0]));
      s.appendChild(box);
    });
  }

  function filteredPeople() {
    var terms = norm(state.q).split(" ").filter(Boolean);
    return state.data.employees.filter(function (r) {
      return (!state.team || r[4] === state.team) && match(r[0], r[1], terms);
    });
  }
  function breaksByName() {
    var byName = {};
    state.data.breaks.forEach(function (r) {
      (byName[r[2]] = byName[r[2]] || []).push(r);
    });
    Object.keys(byName).forEach(function (n) {
      byName[n].sort(function (a, b) { return a[0] < b[0] ? -1 : 1; });
    });
    return byName;
  }
  function filteredBreaks() {
    var terms = norm(state.q).split(" ").filter(Boolean);
    return state.data.breaks.filter(function (r) {
      if (state.team && r[1] !== state.team) return false;
      return terms.length ? match(r[2], "", terms) : true;
    }).sort(function (a, b) { return a[0] === b[0] ? (a[1] < b[1] ? -1 : 1) : (a[0] < b[0] ? -1 : 1); });
  }
  function shiftText(r) {
    var t = T();
    return (r[2] && r[3]) ? t.shiftIs + r[2] + t.shiftTo + r[3] : t.noShift;
  }
  function breakCell(r) {
    return r[0] + (r[3] ? " (" + Number(r[3]) + " min)" : "");
  }

  function renderList() {
    var t = T();
    var d = state.data;
    var list = document.getElementById("list");
    list.innerHTML = "";

    if (state.view === "p") {
      var byName = breaksByName();
      var people = filteredPeople();
      var nowM = nowMinutes();
      var sm = shiftMap();
      var totalMin = {}, firstAdj = {};
      people.forEach(function (r) {
        var sum = 0, fa = null;
        (byName[r[0]] || []).forEach(function (b) {
          if (Number(b[3]) > 0) sum += Number(b[3]);
          var a = adjMin(toMin(b[0]), sm[r[0]]);
          if (fa == null || a < fa) fa = a;
        });
        totalMin[r[0]] = sum;
        firstAdj[r[0]] = (fa == null) ? 99999 : fa;
      });
      people.sort(function (a, b) {
        return (firstAdj[a[0]] - firstAdj[b[0]]) || (a[0] < b[0] ? -1 : 1);
      });
      list.appendChild(el("h2", null, t.people + " · " + fmt(people.length) + " " + t.results));
      if (!people.length) { list.appendChild(el("p", "empty", t.noResult)); return; }
      people.forEach(function (r) {
        var row = el("div", "row");
        var nm = el("div", "nm", r[0]);
        if (totalMin[r[0]] > 0) nm.appendChild(el("span", "mins", totalMin[r[0]] + " min"));
        row.appendChild(nm);
        row.appendChild(el("div", "dt", r[4] + " · " + shiftText(r)));
        var bs = byName[r[0]] || [];
        var vl = el("div", "vl" + (bs.length ? "" : " off"));
        if (!bs.length) {
          vl.textContent = t.noBreak;
        } else {
          var adjs = bs.map(function (b) { return adjMin(toMin(b[0]), sm[r[0]]); });
          var nextIdx = -1, best = Infinity;
          if (nowM != null) adjs.forEach(function (a, i) { if (a > nowM && a < best) { best = a; nextIdx = i; } });
          bs.forEach(function (b, i) {
            if (i) vl.appendChild(document.createTextNode(" · "));
            var sp = el("span", null, breakCell(b));
            if (nowM != null) {
              if (i === nextIdx) sp.className = "b-next";
              else if (adjs[i] <= nowM) sp.className = "b-past";
            }
            vl.appendChild(sp);
          });
        }
        row.appendChild(vl);
        list.appendChild(row);
      });
    } else {
      var nowM = nowMinutes();
      var sm = shiftMap();
      var slots = {};
      var slotAdj = {};
      filteredBreaks().forEach(function (r) {
        (slots[r[0]] = slots[r[0]] || {})[r[1]] = (slots[r[0]] || {})[r[1]] || [];
        slots[r[0]][r[1]].push({ n: r[2], d: r[3] });
        var a = adjMin(toMin(r[0]), sm[r[2]]);
        if (slotAdj[r[0]] == null || a < slotAdj[r[0]]) slotAdj[r[0]] = a;
      });
      var keys = Object.keys(slots).sort();
      list.appendChild(el("h2", null, t.full + " · " + fmt(keys.length) + " " + t.slots));
      if (!keys.length) { list.appendChild(el("p", "empty", t.noResult)); return; }
      var nextSlot = null, bestS = Infinity;
      if (nowM != null) keys.forEach(function (tm) { var a = slotAdj[tm]; if (a > nowM && a < bestS) { bestS = a; nextSlot = tm; } });
      keys.forEach(function (tm) {
        var gm = slots[tm];
        var count = 0;
        var detail = TEAMS.filter(function (g) { return gm[g]; }).map(function (g) {
          count += gm[g].length;
          return g + ": " + gm[g].map(function (e) {
            return e.n + (Number(e.d) > 0 ? " (" + e.d + " min)" : "");
          }).join(state.lang === "ar" ? "، " : ", ");
        }).join(" · ");
        var cls = "row";
        if (nowM != null) {
          if (tm === nextSlot) cls += " b-next";
          else if (slotAdj[tm] <= nowM) cls += " b-past";
        }
        var row = el("div", cls);
        row.appendChild(el("div", "nm", tm));
        row.appendChild(el("div", "dt", detail));
        row.appendChild(el("div", "vl", fmt(count)));
        list.appendChild(row);
      });
    }
  }

  function renderDates() {
    var t = T();
    var d = state.data;
    document.getElementById("daydate").textContent =
      new Date(d.meta.date + "T12:00:00").toLocaleDateString(loc(), { weekday: "long", day: "numeric", month: "long", year: "numeric" }) +
      " · " + t.daySub;
    document.getElementById("updated").textContent = t.updatedPre +
      new Date(d.meta.updated).toLocaleString(loc(), { weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Africa/Cairo" }) +
      t.updatedPost;
  }

  function renderAll() {
    applyChrome();
    renderChips();
    renderStats(state.data);
    renderList();
    renderDates();
  }

  /* ---------- same-time grouping helper (shared by viewer + downloads) ---------- */
  function sortByBreak(people, byName, sm) {
    var fa = {};
    people.forEach(function (r) {
      var f = null;
      (byName[r[0]] || []).forEach(function (b) {
        var a = adjMin(toMin(b[0]), sm[r[0]]);
        if (f == null || a < f) f = a;
      });
      fa[r[0]] = (f == null) ? 99999 : f;
    });
    return people.slice().sort(function (a, b) {
      return (fa[a[0]] - fa[b[0]]) || (a[0] < b[0] ? -1 : 1);
    });
  }

  /* ---------- current view as a table (shared by Excel + image) ---------- */
  function viewTable(forceView) {
    var t = I18N.en;
    if ((forceView || state.view) === "p") {
      var byName = breaksByName();
      var people = sortByBreak(filteredPeople(), byName, shiftMap());
      var maxB = 0;
      people.forEach(function (r) {
        var n = (byName[r[0]] || []).length;
        if (n > maxB) maxB = n;
      });
      var headers = [t.hName, t.hHR, t.hTeam, t.hShift];
      for (var i = 1; i <= maxB; i++) headers.push(t.hBreak + fmt(i));
      headers.push(t.hTotal);
      var rows = people.map(function (r) {
        var bs = byName[r[0]] || [];
        var total = 0;
        var row = [r[0], r[1] || "", r[4], (r[2] && r[3]) ? r[2] + " - " + r[3] : ""];
        for (var i = 0; i < maxB; i++) {
          row.push(bs[i] ? bs[i][0] : "");
          if (bs[i] && bs[i][3]) total += Number(bs[i][3]) || 0;
        }
        row.push(total);
        return row;
      });
      return { headers: headers, rows: rows, sheet: t.sheetPeople };
    }
    var rows = filteredBreaks().map(function (r) {
      return [r[0], r[1], r[2], Number(r[3]) || 0];
    });
    return { headers: [t.hTime, t.hTeam, t.hEmployee, t.hDur], rows: rows, sheet: t.sheetFull };
  }

  function fileBase() {
    return "breaks-" + state.data.meta.date;
  }

  function saveBlob(blob, filename) {
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 4000);
    window.__lastDownload = { name: filename, size: blob.size, type: blob.type };
  }

  /* ---------- Excel (ExcelJS: styled, landscape) ---------- */
  var TEAM_XLS = { Allianz: "FF2F5FB3", WA: "FF3F8F5A", Hotline: "FFB8433A" };
  var excelLoading = null;
  function loadExcelLib(cb) {
    if (window.ExcelJS) return cb(null);
    if (excelLoading) { excelLoading.push(cb); return; }
    excelLoading = [cb];
    var s = document.createElement("script");
    s.src = "vendor/exceljs.min.js";
    s.onload = function () { var cbs = excelLoading; excelLoading = null; cbs.forEach(function (c) { c(null); }); };
    s.onerror = function () { var cbs = excelLoading; excelLoading = null; cbs.forEach(function (c) { c(new Error("excel lib load failed")); }); };
    document.head.appendChild(s);
  }
  function thinBorders() {
    var s = { style: "thin", color: { argb: "FFD5DDE4" } };
    return { top: s, left: s, bottom: s, right: s };
  }

  /* ---------- Export layout: two side-by-side blocks, Break time | Allianz | Hotline | WA ---------- */
  var EX = {
    teams: ["Allianz", "Hotline", "WA"],
    head: { Allianz: "FF2F5FB3", Hotline: "FFB8433A", WA: "FF3F8F5A" },
    tint: { Allianz: "FFEAF0FA", Hotline: "FFFBECE9", WA: "FFE9F4EC" },
    brown: "FF8B5A3C", cream: "FFF5EDE3", ink: "FF3A2A20"
  };
  function exportSlots() {
    var slots = {};
    filteredBreaks().forEach(function (r) {
      var o = slots[r[0]] = slots[r[0]] || {};
      (o[r[1]] = o[r[1]] || []).push(r[2] + (Number(r[3]) > 0 ? " (" + Number(r[3]) + "m)" : ""));
    });
    var rows = Object.keys(slots).sort().map(function (tm) {
      return [tm].concat(EX.teams.map(function (g) { return (slots[tm][g] || []).join(" + "); }));
    });
    var half = Math.ceil(rows.length / 2);
    return { left: rows.slice(0, half), right: rows.slice(half), date: state.data.meta.date };
  }

  function downloadExcel() {
    loadExcelLib(function (err) {
      if (err) return;
      var ex = exportSlots();
      var wb = new ExcelJS.Workbook();
      var ws = wb.addWorksheet("Breaks " + ex.date, { views: [{ state: "frozen", ySplit: 2 }] });
      ws.pageSetup = { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9, margins: { left: 0.3, right: 0.3, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 } };
      var widths = [11, 18, 44, 18, 2, 11, 18, 44, 18];
      ws.columns = widths.map(function (w) { return { width: w }; });
      var thin = { style: "thin", color: { argb: "FFD9C9B6" } };
      var bd = { top: thin, left: thin, bottom: thin, right: thin };
      function fill(c) { return { type: "pattern", pattern: "solid", fgColor: { argb: c } }; }
      ws.mergeCells("A1:I1");
      var tc = ws.getCell("A1");
      tc.value = ex.date;
      tc.fill = fill(EX.brown);
      tc.font = { bold: true, size: 16, color: { argb: "FFFFFFFF" } };
      tc.alignment = { horizontal: "center", vertical: "middle" };
      ws.getRow(1).height = 28;
      var hr = ws.getRow(2);
      hr.height = 22;
      [0, 5].forEach(function (off) {
        ["Break time", "Allianz", "Hotline", "WA"].forEach(function (h, i) {
          var cell = hr.getCell(off + i + 1);
          cell.value = h;
          cell.fill = fill(i === 0 ? EX.brown : EX.head[h]);
          cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
          cell.alignment = { horizontal: "center", vertical: "middle" };
          cell.border = bd;
        });
      });
      var n = Math.max(ex.left.length, ex.right.length);
      for (var i = 0; i < n; i++) {
        var row = ws.getRow(i + 3);
        var lines = 1;
        [[ex.left[i], 0], [ex.right[i], 5]].forEach(function (p) {
          var data = p[0], off = p[1];
          if (!data) return;
          data.forEach(function (v, ci) {
            var cell = row.getCell(off + ci + 1);
            cell.value = v;
            cell.border = bd;
            cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
            if (ci === 0) { cell.fill = fill(EX.cream); cell.font = { bold: true, color: { argb: EX.ink } }; }
            else {
              cell.font = { color: { argb: EX.ink } };
              if (v) cell.fill = fill(EX.tint[EX.teams[ci - 1]]);
              var l = Math.ceil(String(v).length / (widths[off + ci] * 1.05));
              if (l > lines) lines = l;
            }
          });
        });
        row.height = lines * 16 + 6;
      }
      wb.xlsx.writeBuffer().then(function (buf) {
        saveBlob(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), fileBase() + ".xlsx");
      });
    });
  }

  /* ---------- Image (landscape, two blocks) ---------- */
  function hex(a) { return "#" + a.slice(2); }
  function downloadImage() {
    var ex = exportSlots();
    var W = 2000, pad = 24, gap = 24;
    var gw = Math.floor((W - pad * 2 - gap) / 2);
    var fr = [0.145, 0.17, 0.44, 0.245];
    var colW = fr.map(function (f) { return Math.floor(gw * f); });
    var canvas = document.createElement("canvas");
    var ctx = canvas.getContext("2d");
    var F = "'Segoe UI', Tahoma, Arial, sans-serif";
    var fCell = "21px " + F, fBold = "700 21px " + F, fHead = "700 23px " + F;
    ctx.font = fCell;
    function wrapCell(text, width) {
      text = String(text == null ? "" : text);
      if (!text) return [""];
      var words = text.split(" "), lines = [], cur = "";
      words.forEach(function (w) {
        var s = cur ? cur + " " + w : w;
        if (ctx.measureText(s).width + 20 > width && cur) { lines.push(cur); cur = w; } else cur = s;
      });
      lines.push(cur);
      return lines;
    }
    var n = Math.max(ex.left.length, ex.right.length);
    var heights = [];
    for (var i = 0; i < n; i++) {
      var ml = 1;
      [ex.left[i], ex.right[i]].forEach(function (d) {
        if (!d) return;
        d.forEach(function (v, ci) { var k = wrapCell(v, colW[ci]).length; if (k > ml) ml = k; });
      });
      heights.push(ml * 27 + 14);
    }
    var titleH = 70, headH = 44, bodyH = heights.reduce(function (a, b) { return a + b; }, 0);
    var H = pad + titleH + headH + bodyH + pad;
    canvas.width = W; canvas.height = H;
    ctx = canvas.getContext("2d");
    ctx.textBaseline = "middle"; ctx.textAlign = "center";
    ctx.fillStyle = hex(EX.cream); ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = hex(EX.brown); ctx.fillRect(pad, pad, W - pad * 2, titleH);
    ctx.fillStyle = "#fff"; ctx.font = "700 36px " + F;
    ctx.fillText(ex.date, W / 2, pad + titleH / 2);
    [[ex.left, pad], [ex.right, pad + gw + gap]].forEach(function (blk) {
      var rows = blk[0], x0 = blk[1];
      var xs = [], x = x0;
      colW.forEach(function (w) { xs.push(x); x += w; });
      var y = pad + titleH;
      ["Break time", "Allianz", "Hotline", "WA"].forEach(function (h, i) {
        ctx.fillStyle = i === 0 ? hex(EX.brown) : hex(EX.head[h]);
        ctx.fillRect(xs[i], y, colW[i], headH);
        ctx.fillStyle = "#fff"; ctx.font = fHead;
        ctx.fillText(h, xs[i] + colW[i] / 2, y + headH / 2);
      });
      y += headH;
      rows.forEach(function (r, ri) {
        var h = heights[ri];
        r.forEach(function (v, ci) {
          ctx.fillStyle = ci === 0 ? hex(EX.cream) : (v ? hex(EX.tint[EX.teams[ci - 1]]) : "#ffffff");
          ctx.fillRect(xs[ci], y, colW[ci], h);
          ctx.strokeStyle = "#d9c9b6"; ctx.lineWidth = 1;
          ctx.strokeRect(xs[ci] + 0.5, y + 0.5, colW[ci], h);
          ctx.fillStyle = hex(EX.ink);
          ctx.font = ci === 0 ? fBold : fCell;
          var lines = wrapCell(v, colW[ci]);
          var sy = y + (h - lines.length * 27) / 2 + 13;
          lines.forEach(function (ln, li) { ctx.fillText(ln, xs[ci] + colW[ci] / 2, sy + li * 27); });
        });
        y += h;
      });
    });
    canvas.toBlob(function (blob) {
      if (blob) saveBlob(blob, fileBase() + ".png");
    }, "image/png");
  }


  function peopleColors() {
    return {
      bg: "#f5ede3", card: "#fffaf4", ink: "#3a2a20", muted: "#7d6857",
      accent: "#8b5a3c", line: "#e8d7c3", band: "#f0dcc8", alt: "#faf1e6",
      team: { Allianz: "#2f5fb3", WA: "#3f8f5a", Hotline: "#b8433a" }
    };
  }
  function dlTitle() {
    var cfg = (window.SITE_CONFIG && window.SITE_CONFIG.title) || "";
    var ct = (state.data && state.data.title) || cfg;
    return (ct && ct !== I18N.ar.defaultTitle) ? ct : I18N.en.defaultTitle;
  }

  function downloadExcelPeople() {
    loadExcelLib(function (err) {
      if (err) return;
      var tbl = viewTable("p");
      var rtl = false;
      var wb = new ExcelJS.Workbook();
      var ws = wb.addWorksheet(tbl.sheet.slice(0, 31), { views: [{ rightToLeft: rtl, state: "frozen", ySplit: 1 }] });
      ws.pageSetup = { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 };
      ws.columns = tbl.headers.map(function (h, i) {
        var w = String(h).length;
        tbl.rows.forEach(function (r) {
          var l = String(r[i] == null ? "" : r[i]).length;
          if (l > w) w = l;
        });
        return { width: Math.min(Math.max(w * 1.15 + 3, 10), 42) };
      });
      var head = ws.addRow(tbl.headers);
      head.height = 22;
      head.eachCell(function (cell) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF8B5A3C" } };
        cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.border = thinBorders();
      });
      var teamCol = tbl.headers.indexOf(T().hTeam);
      tbl.rows.forEach(function (r, ri) {
        var row = ws.addRow(r);
        row.eachCell({ includeEmpty: true }, function (cell, ci) {
          cell.border = thinBorders();
          cell.alignment = { vertical: "middle", horizontal: ci === 1 ? (rtl ? "right" : "left") : "center" };
          if (ri % 2) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF5EDE3" } };
        });
        if (teamCol >= 0 && TEAM_XLS[r[teamCol]]) {
          row.getCell(teamCol + 1).font = { bold: true, color: { argb: TEAM_XLS[r[teamCol]] } };
        }
      });
      wb.xlsx.writeBuffer().then(function (buf) {
        saveBlob(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), fileBase() + "-people.xlsx");
      });
    });
  }


  /* ---------- Image per person ---------- */
  function downloadImagePeople() {
    var t = I18N.en;
    var rtl = false;
    var c = peopleColors();

    var headers, rows;
    if (true) {
      var byName = breaksByName();
      headers = [t.hName, t.hTeam, t.hShift, t.breaks];
      rows = sortByBreak(filteredPeople(), byName, shiftMap()).map(function (r) {
        var bs = (byName[r[0]] || []).map(breakCell);
        return [r[0], r[4], (r[2] && r[3]) ? r[2] + " - " + r[3] : "", bs.join("  \u00b7  ") || t.noBreak];
      });
    } else {
      headers = [t.hTime, t.hTeam, t.hEmployee];
      rows = filteredBreaks().map(function (r) { return [r[0], r[1], r[2] + (Number(r[3]) > 0 ? " (" + r[3] + " min)" : "")]; });
    }
    var nCols = headers.length;

    var W = 1920, pad = 26, gap = 22;
    var groups = rows.length > 72 ? 3 : (rows.length > 28 ? 2 : 1);
    var per = Math.max(Math.ceil(rows.length / groups), 1);
    var gw = Math.floor((W - pad * 2 - gap * (groups - 1)) / groups);
    var fr = true ? [0.28, 0.14, 0.20, 0.38] : [0.16, 0.20, 0.64];
    var colW = fr.map(function (f) { return Math.floor(gw * f); });

    var canvas = document.createElement("canvas");
    var ctx = canvas.getContext("2d");
    var fTitle = "700 46px 'Segoe UI', Tahoma, sans-serif";
    var fSub = "26px 'Segoe UI', Tahoma, sans-serif";
    var fHead = "700 22px 'Segoe UI', Tahoma, sans-serif";
    var fCell = "21px 'Segoe UI', Tahoma, sans-serif";
    var fBold = "700 21px 'Segoe UI', Tahoma, sans-serif";

    function wrapCell(text, width) {
      text = String(text == null ? "" : text);
      if (!text) return [""];
      var words = text.split(" ");
      var lines = [], cur = "";
      words.forEach(function (w) {
        var tryS = cur ? cur + " " + w : w;
        if (ctx.measureText(tryS).width + 18 > width && cur) { lines.push(cur); cur = w; }
        else cur = tryS;
      });
      lines.push(cur);
      return lines;
    }

    ctx.font = fCell;
    var rowHeights = rows.map(function (r) {
      var maxLines = 1;
      for (var i = 0; i < nCols; i++) {
        var n = wrapCell(r[i], colW[i]).length;
        if (n > maxLines) maxLines = n;
      }
      return maxLines * 27 + 13;
    });

    var titleH = 110, headH = 42, footH = 48;
    var groupBody = [];
    var bodyH = 0;
    for (var g = 0; g < groups; g++) {
      var h = 0;
      for (var i = g * per; i < Math.min((g + 1) * per, rows.length); i++) h += rowHeights[i];
      groupBody.push(h);
      if (h > bodyH) bodyH = h;
    }
    var H = pad + titleH + headH + bodyH + footH + pad;

    canvas.width = W;
    canvas.height = H;
    ctx = canvas.getContext("2d");
    ctx.direction = rtl ? "rtl" : "ltr";
    ctx.textBaseline = "middle";

    ctx.fillStyle = c.bg;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = c.card;
    roundRect(ctx, 8, 8, W - 16, H - 16, 20);
    ctx.fill();

    // title band
    ctx.fillStyle = c.accent;
    roundRect(ctx, 8, 8, W - 16, pad + titleH, 20);
    ctx.fill();
    ctx.fillRect(8, 8 + pad + titleH - 26, W - 16, 26);
    ctx.textAlign = "center";
    ctx.fillStyle = "#ffffff";
    ctx.font = fTitle;
    ctx.fillText(dlTitle(), W / 2, 8 + pad + 30);
    ctx.font = fSub;
    var dstr = new Date(state.data.meta.date + "T12:00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    ctx.globalAlpha = 0.92;
    ctx.fillText(dstr + " \u00b7 " + (true ? t.people : t.full), W / 2, 8 + pad + 74);
    ctx.globalAlpha = 1;

    var order = [];
    for (var i = 0; i < nCols; i++) order.push(rtl ? nCols - 1 - i : i);

    for (var g = 0; g < groups; g++) {
      var x0 = pad + g * (gw + gap);
      var xs = [], x = x0;
      for (var i = 0; i < nCols; i++) { xs.push(x); x += colW[i]; }
      var y = pad + titleH;

      ctx.fillStyle = c.band;
      ctx.fillRect(x0, y, gw, headH);
      ctx.font = fHead;
      ctx.fillStyle = c.ink;
      order.forEach(function (ci, pos) {
        ctx.textAlign = "center";
        ctx.fillText(headers[ci], xs[pos] + colW[pos] / 2, y + headH / 2);
      });
      y += headH;

      var start = g * per, end = Math.min(start + per, rows.length);
      for (var ri = start; ri < end; ri++) {
        var r = rows[ri];
        ctx.fillStyle = (ri - start) % 2 ? c.alt : c.card;
        ctx.fillRect(x0, y, gw, rowHeights[ri]);
        ctx.direction = "ltr";
        order.forEach(function (ci, pos) {
          ctx.font = pos === 0 ? fBold : fCell;
          var lines = wrapCell(r[ci], colW[pos]);
          ctx.fillStyle = (headers[ci] === t.hTeam && c.team[r[ci]]) ? c.team[r[ci]] : (pos === nCols - 1 && true ? c.accent : c.ink);
          ctx.textAlign = "center";
          var tx = xs[pos] + colW[pos] / 2;
          var blockH = lines.length * 27;
          var sy = y + (rowHeights[ri] - blockH) / 2 + 13;
          lines.forEach(function (ln, li) { ctx.fillText(ln, tx, sy + li * 27); });
        });
        ctx.strokeStyle = c.line;
        ctx.beginPath();
        ctx.moveTo(x0, y + rowHeights[ri]);
        ctx.lineTo(x0 + gw, y + rowHeights[ri]);
        ctx.stroke();
        y += rowHeights[ri];
      }
    }

    ctx.textAlign = "center";
    ctx.fillStyle = c.muted;
    ctx.font = "20px 'Segoe UI', Tahoma, sans-serif";
    ctx.fillText(dlTitle() + " \u00b7 " + dstr, W / 2, H - pad - 16);

    canvas.toBlob(function (blob) {
      if (blob) saveBlob(blob, fileBase() + "-people.png");
    }, "image/png");
  }


  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  /* ---------- wiring ---------- */
  function boot(d) {
    state.data = d;
    var q = document.getElementById("q");
    q.addEventListener("input", function () { state.q = q.value; renderList(); });
    document.getElementById("themeBtn").onclick = function () {
      state.dark = !state.dark;
      try { localStorage.setItem("breaks_dark", state.dark ? "1" : "0"); } catch (e) {}
      applyChrome();
    };
    document.getElementById("langBtn").onclick = function () {
      state.lang = state.lang === "ar" ? "en" : "ar";
      try { localStorage.setItem("breaks_lang", state.lang); } catch (e) {}
      renderAll();
    };
    document.getElementById("xlsBtn").onclick = downloadExcel;
    document.getElementById("imgBtn").onclick = downloadImage;
    document.getElementById("pxlsBtn").onclick = downloadExcelPeople;
    document.getElementById("pimgBtn").onclick = downloadImagePeople;
    renderAll();
  }

  fetch("data.json?ts=" + Date.now(), { cache: "no-store" }).then(function (r) {
    if (!r.ok) throw new Error("no data");
    return r.json();
  }).then(boot).catch(function () {
    applyChrome();
    var list = document.getElementById("list");
    list.innerHTML = "";
    list.appendChild(el("p", "empty", T().unavailable));
  });
})();
