import { rosterFrom, parseSched, genBreaks } from "./genbreaks.js";

const $ = (id) => document.getElementById(id);
const norm = (s) => String(s || "").toLowerCase()
  .replace(/[ً-ٰٕ]/g, "")
  .replace(/[أإآٱ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي")
  .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632))
  .replace(/\s+/g, " ").trim();
const todayCairo = () => new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Cairo" });
const ar = (n) => Number(n).toLocaleString("ar-EG");

let pending = null; // {data, title}

function showErr(el, msg) { el.textContent = msg; el.hidden = !msg; }
function setCards(which) {
  $("preview-card").hidden = which !== "preview";
  $("done-card").hidden = which !== "done";
}

// Dual backend: on workers.dev we save through the Worker; on github.io
// (work-laptop version) we write data.json straight to the repo. The repo
// token travels encrypted in gh-key.json and is unlocked in memory by the
// same admin password - no token is ever typed or stored on a device.
const ON_GH = location.hostname.endsWith("github.io");
const GH_API = "https://api.github.com/repos/bvtndv78v4-prog/Breaks/contents/data.json";

function fetchCurrent() {
  const url = ON_GH ? "data.json?ts=" + Date.now() : "/api/data";
  return fetch(url, { cache: "no-store" }).then((r) => (r.ok ? r.json() : null));
}

const b64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function ghKey(pw) {
  const j = await fetch("gh-key.json?ts=" + Date.now(), { cache: "no-store" }).then((r) => (r.ok ? r.json() : null));
  if (!j) return null;
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(pw), "PBKDF2", false, ["deriveKey"]);
  const key = await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: b64(j.salt), iterations: j.iter, hash: "SHA-256" },
    base, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
  try {
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: b64(j.iv) }, key, b64(j.ct));
    return new TextDecoder().decode(plain);
  } catch {
    return null;
  }
}

async function saveData(data, title) {
  if (ON_GH) {
    const t = await ghKey($("pw").value);
    if (!t) return { err: "كلمة السر غلط." };
    const hdrs = { authorization: "Bearer " + t, accept: "application/vnd.github+json", "content-type": "application/json" };
    const cur = await fetch(GH_API + "?ref=main", { headers: hdrs });
    if (cur.status === 401 || cur.status === 403) return { err: "مش قادر أوصل لجيت هب دلوقتي. جرّب تاني أو قول لي." };
    let sha;
    if (cur.ok) sha = (await cur.json()).sha;
    const payload = { ...data, title: title || null };
    const body = { message: "Update break schedule " + data.meta.date, content: btoa(unescape(encodeURIComponent(JSON.stringify(payload)))) };
    if (sha) body.sha = sha;
    const r = await fetch(GH_API, { method: "PUT", headers: hdrs, body: JSON.stringify(body) });
    if (!r.ok) return { err: "جيت هب رفض الحفظ (" + r.status + "). جرّب تاني أو قول لي." };
    return { out: { date: data.meta.date, employees: data.employees.length, breaks: data.breaks.length } };
  }
  const r = await fetch("/api/upload", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ password: $("pw").value, data, title: title || undefined }),
  });
  const out = await r.json().catch(() => ({}));
  if (r.status === 401) return { err: "كلمة السر غلط." };
  if (!r.ok) return { err: "السيرفر رفض البيانات (" + (out.error || r.status) + ")." };
  return { out };
}

async function fileToRows(file) {
  let buf = await file.arrayBuffer();
  if (/\.csv$/i.test(file.name)) {
    let txt = new TextDecoder("utf-8").decode(buf);
    if (txt.charCodeAt(0) === 0xfeff) txt = txt.slice(1); // strip BOM
    const wb = XLSX.read(txt, { type: "string" });
    return XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: true, defval: "" });
  }
  const wb = XLSX.read(buf, { type: "array" });
  return XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: true, defval: "" });
}

function mergeRoster(current, incoming) {
  const byKey = new Map(current.map((r) => [norm(r[0]), r]));
  let updated = 0, added = 0;
  incoming.forEach((r) => {
    const k = norm(r[0]);
    if (byKey.has(k)) { byKey.get(k).splice(0, 5, ...r); updated++; }
    else { current.push(r); byKey.set(k, r); added++; }
  });
  return { updated, added };
}

function summarize(html) { $("summary").innerHTML = html; }
const li = (t) => `<li>${t}</li>`;

async function review() {
  showErr($("err"), "");
  const pw = $("pw").value, file = $("file").files[0];
  if (!pw) return showErr($("err"), "اكتب كلمة السر الأول.");
  if (!file) return showErr($("err"), "اختار الملف الأول.");

  let rows;
  try { rows = await fileToRows(file); }
  catch { return showErr($("err"), "مش قادر أقرا الملف. اتأكد إنه xlsx أو csv سليم."); }

  const cur = await fetchCurrent();
  if (!cur) return showErr($("err"), "مش قادر أوصل للبيانات الحالية. جرّب تاني.");

  const isSched = rows.some((r) => r.some((c) => /^break\s*time$/i.test(String(c).trim())));
  const hi = rows.findIndex((r) => r.some((c) => String(c).trim()));
  const H = (hi >= 0 ? rows[hi] : []).map((c) => norm(c));
  const has = (re) => H.some((h) => h && re.test(h));
  const hasShiftCols = has(/^in(\s|$)|دخول|بدايه|start/) || has(/^out(\s|$)|خروج|نهايه|end/);

  const employees = cur.employees.map((r) => r.slice());
  let breaks = cur.breaks.map((r) => r.slice());
  let date = cur.meta.date;
  let notes = [];

  try {
    if (isSched) {
      const sched = parseSched(rows, file.name);
      breaks = sched.r.map((r) => [String(r[0]), String(r[1]), String(r[2]), String(r[3] || "")]);
      date = sched.date || todayCairo();
      notes.push(li(`ملف جدول بريكات: هيتم استبدال الجدول الحالي بالكامل (${ar(breaks.length)} بريك).`));
    } else {
      const roster = rosterFrom(rows);
      const m = mergeRoster(employees, roster);
      notes.push(li(`الموظفين: ${ar(m.updated)} اتحدثوا، ${ar(m.added)} اتضافوا. الإجمالي ${ar(employees.length)}.`));
      if (hasShiftCols) {
        const gen = genBreaks(roster.filter((r) => r[2] && r[3]).length ? employees.filter((r) => r[2] && r[3]).map((r) => ({ n: r[0], g: r[4], a: r[2], b: r[3] })) : []);
        breaks = gen.rows.map((r) => [String(r[0]), String(r[1]), String(r[2]), String(r[3] || "")]);
        date = todayCairo();
        notes.push(li(`اتعمل جدول بريكات جديد ليوم ${date}: ${ar(breaks.length)} بريك لـ ${ar(gen.n)} موظف.`));
        if (gen.skip) notes.push(li(`⚠️ ${ar(gen.skip)} موظف مالهمش بريك (شيفت أقل من ساعتين أو مفيش وقت مناسب).`));
        if (gen.relaxed && gen.relaxed.length) notes.push(li(`⚠️ اتخففت بعض القيود لـ: ${gen.relaxed.join("، ")}.`));
      } else {
        notes.push(li("الملف مفيهوش أعمدة دخول/خروج، فهيتحدث الكشف بس والجدول الحالي هيفضل زي ما هو."));
      }
    }
  } catch (e) {
    const msg = String((e && e.message) || e);
    if (msg === "errName") return showErr($("err"), "مش لاقي عمود الاسم في الملف.");
    if (msg === "errHdr") return showErr($("err"), "مش لاقي عمود Break time في الملف.");
    if (msg === "errEmpty") return showErr($("err"), "الملف فاضي.");
    return showErr($("err"), "حصل خطأ في قراية الملف: " + msg);
  }

  pending = { data: { meta: { date, updated: new Date().toISOString() }, employees, breaks }, title: $("btitle").value.trim() };
  summarize(`<ul>${notes.join("")}</ul><p>تاريخ الجدول: <b>${date}</b></p>`);
  setCards("preview");
}

async function publish() {
  showErr($("err2"), "");
  $("confirm").disabled = true;
  try {
    const res = await saveData(pending.data, pending.title);
    if (res.err) { showErr($("err2"), res.err); return; }
    const out = res.out;
    $("done-summary").innerHTML = `<p>اتنشر جدول <b>${out.date}</b>: ${ar(out.employees)} موظف، ${ar(out.breaks)} بريك.</p>${ON_GH ? "<p class=\"muted\">هيظهر على البورد خلال دقيقة تقريبا.</p>" : ""}`;
    setCards("done");
  } catch {
    showErr($("err2"), "مش قادر أوصل للسيرفر. جرّب تاني.");
  } finally {
    $("confirm").disabled = false;
  }
}

$("go").addEventListener("click", review);
$("confirm").addEventListener("click", publish);
$("cancel").addEventListener("click", () => { pending = null; setCards("form"); });

// ---------- Manual break editor (admin only) ----------
let editCur = null;   // {meta, employees, breaks} snapshot from the server
let editRows = [];    // [{time, group, name, dur}] working copy

const mmOf = (t) => { const m = /^(\d{2}):(\d{2})$/.exec(t); return m ? (+m[1]) * 60 + (+m[2]) : -1; };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

function renderEditRows() {
  const tb = $("edit-rows");
  tb.innerHTML = editRows.map((r, i) =>
    `<tr>
      <td class="c-time"><input type="time" step="900" value="${esc(r.time)}" data-i="${i}" data-f="time"></td>
      <td><input type="text" value="${esc(r.name)}" data-i="${i}" data-f="name"></td>
      <td><input type="text" value="${esc(r.group)}" data-i="${i}" data-f="group"></td>
      <td class="c-mins"><input type="number" min="1" max="60" placeholder="15" value="${esc(r.dur)}" data-i="${i}" data-f="dur"></td>
      <td class="c-del"><button type="button" class="del" data-del="${i}" title="امسح">✕</button></td>
    </tr>`).join("");
}

function readEditRows() {
  $("edit-rows").querySelectorAll("input").forEach((inp) => {
    const r = editRows[+inp.dataset.i];
    if (r) r[inp.dataset.f] = inp.value.trim();
  });
}

async function openEditor() {
  showErr($("err3"), ""); $("ok3").hidden = true;
  if (!$("pw").value) {
    $("edit-body").hidden = false;
    return showErr($("err3"), "اكتب كلمة السر في الخانة فوق الأول، بعدين دوس افتح التعديل تاني.");
  }
  const cur = await fetchCurrent();
  if (!cur) return showErr($("err3"), "مش قادر أوصل للبيانات الحالية. جرّب تاني.");
  editCur = cur;
  editRows = cur.breaks.map((r) => ({ time: r[0], group: r[1], name: r[2], dur: r[3] }));
  editRows.sort((a, b) => mmOf(a.time) - mmOf(b.time));
  $("add-emp").innerHTML = cur.employees
    .map((r) => `<option value="${esc(r[0])}||${esc(r[4])}">${esc(r[0])}${r[4] ? " — " + esc(r[4]) : ""}</option>`).join("");
  renderEditRows();
  $("edit-body").hidden = false;
}

function addBreak() {
  showErr($("err3"), ""); $("ok3").hidden = true;
  readEditRows();
  const [name, group] = ($("add-emp").value || "||").split("||");
  const time = $("add-time").value, dur = $("add-mins").value.trim();
  if (!name) return showErr($("err3"), "اختار الموظف الأول.");
  if (mmOf(time) < 0) return showErr($("err3"), "اكتب وقت البريك.");
  if (dur && (!/^\d+$/.test(dur) || +dur < 1 || +dur > 60)) return showErr($("err3"), "الدقايق لازم رقم من 1 لـ 60 (أو سيبها فاضية = 15).");
  editRows.push({ time, group, name, dur });
  editRows.sort((a, b) => mmOf(a.time) - mmOf(b.time));
  renderEditRows();
}

async function saveEdits() {
  showErr($("err3"), ""); $("ok3").hidden = true;
  readEditRows();
  for (const r of editRows) {
    if (mmOf(r.time) < 0) return showErr($("err3"), `وقت مش مظبوط عند ${r.name || "صف"}.`);
    if (!r.name.trim()) return showErr($("err3"), "في بريك من غير اسم.");
    if (r.dur && (!/^\d+$/.test(r.dur) || +r.dur < 1 || +r.dur > 60)) return showErr($("err3"), `الدقايق مش مظبوطة عند ${r.name}.`);
  }
  const data = {
    meta: { date: editCur.meta.date, updated: new Date().toISOString() },
    employees: editCur.employees,
    breaks: editRows.map((r) => [r.time, r.group, r.name, r.dur]),
  };
  $("edit-save").disabled = true;
  try {
    const res = await saveData(data, editCur.title || undefined);
    if (res.err) return showErr($("err3"), res.err);
    const out = res.out;
    editCur = { ...editCur, breaks: data.breaks };
    $("ok3").textContent = `اتحفظ ✅ ${ar(out.breaks)} بريك على جدول ${out.date}. ${ON_GH ? "هيظهر على البورد خلال دقيقة تقريبا." : "الصفحة عند الناس اتحدثت على طول."}`;
    $("ok3").hidden = false;
  } catch {
    showErr($("err3"), "مش قادر أوصل للسيرفر. جرّب تاني.");
  } finally {
    $("edit-save").disabled = false;
  }
}

$("edit-open").addEventListener("click", openEditor);
$("add-go").addEventListener("click", addBreak);
$("edit-save").addEventListener("click", saveEdits);
$("edit-close").addEventListener("click", () => { $("edit-body").hidden = true; editCur = null; editRows = []; });
$("edit-rows").addEventListener("click", (e) => {
  const b = e.target.closest("[data-del]");
  if (!b) return;
  readEditRows();
  editRows.splice(+b.dataset.del, 1);
  renderEditRows();
});

