// Shared services that skills reach through ctx: date and time wording, folder paths, repeat rules.
// No dialogue here (web/agent.js) and no skill logic (skills/<name>/skill.js).
const NLUServices = (() => {
  // ---------- dates and times, in words ----------
  const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const pad2 = n => String(n).padStart(2, "0");
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  const plural = (n, w) => n + " " + w + (n === 1 ? "" : "s");
  const day0 = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const daysApart = (a, b) => Math.round((day0(a) - day0(b)) / 864e5);
  // "2026-10-23T15:00" → local Date
  const fromIso = s => { const [d, t] = s.split("T"); const [y, m, dd] = d.split("-").map(Number); const [h, mi] = (t || "0:0").split(":").map(Number); return new Date(y, m - 1, dd, h, mi); };
  const isoMinute = d => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  const clock = d => pad2(d.getHours()) + ":" + pad2(d.getMinutes());
  // "Friday 23 October" (+ the year when it isn't this year)
  const dayText = (d, now) => DAYS[d.getDay()] + " " + d.getDate() + " " + MONTHS[d.getMonth()] + (d.getFullYear() !== now.getFullYear() ? " " + d.getFullYear() : "");
  // "today at 20:30", "tomorrow at 09:00", "on Friday 23 October at 15:00"
  const whenText = (d, now) => { const k = daysApart(d, now); return (k === 0 ? "today" : k === 1 ? "tomorrow" : "on " + dayText(d, now)) + " at " + clock(d); };
  const durWords = sec => {
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60, out = [];
    if (h) out.push(plural(h, "hour")); if (m) out.push(plural(m, "minute")); if (s) out.push(plural(s, "second"));
    return out.join(" ") || "0 seconds";
  };

  // ---------- repeating rules (RRULE from the date parser) ----------
  const RR_WORD = { MO: "Monday", TU: "Tuesday", WE: "Wednesday", TH: "Thursday", FR: "Friday", SA: "Saturday", SU: "Sunday" };
  const ruleParts = rrule => Object.fromEntries(rrule.split(";").map(x => x.split("=")));
  // " every weekday at 08:15"
  function ruleWords(rrule) {
    const p = ruleParts(rrule);
    const every = p.INTERVAL ? "every " + (p.INTERVAL === "2" ? "other " : p.INTERVAL + " ") : "every ";
    let what = { DAILY: "day", WEEKLY: "week", MONTHLY: "month", YEARLY: "year", HOURLY: "hour", MINUTELY: "minute" }[p.FREQ];
    if (p.BYDAY) what = p.BYDAY === "MO,TU,WE,TH,FR" ? "weekday" : p.BYDAY.split(",").map(d => RR_WORD[d]).join(" and ");
    if (p.INTERVAL && p.INTERVAL !== "2" && !p.BYDAY) what += "s";
    return " " + every + what + (p.BYHOUR ? " at " + pad2(p.BYHOUR) + ":" + pad2(p.BYMINUTE) : "");
  }
  // systemd OnCalendar form of simple rules, null when systemd can't express it
  function onCalendar(rrule) {
    const p = ruleParts(rrule);
    if (p.INTERVAL) return null;
    const t = " " + pad2(p.BYHOUR || 9) + ":" + pad2(p.BYMINUTE || 0) + ":00";
    if (p.FREQ === "DAILY") return "*-*-*" + t;
    if (p.FREQ === "WEEKLY" && p.BYDAY) return p.BYDAY.split(",").map(d => RR_WORD[d].slice(0, 3)).join(",") + " *-*-*" + t;
    return null;
  }

  // ---------- folders ----------
  const XDG = { desktop: "Desktop", documents: "Documents", downloads: "Downloads", music: "Music",
    pictures: "Pictures", videos: "Videos", templates: "Templates", public: "Public" };
  const HERE = /^(here|this (folder|directory|dir)|(the )?current (folder|directory|dir)|cwd|current)$/i;
  // what people call a place on disk → { path, label }
  function where(raw) {
    if (!raw) return { path: "$HOME", label: "your home folder" };
    const v = raw.replace(/^the\s+/i, "").replace(/\s+(folder|directory|dir)$/i, "");
    const low = v.toLowerCase();
    if (HERE.test(low)) return { path: "$HOME", label: "the current folder" };
    if (low === "home" || low === "~") return { path: "$HOME", label: "your home folder" };
    if (XDG[low]) return { path: "$HOME/" + XDG[low], label: XDG[low] };
    return { path: "$HOME/" + v, label: v };
  }
  // A folder someone named, checked against the folders known on this device: the standard ones,
  // those the device lists (agent.folders) and those the person said yes to (kept on the device).
  // → { known: true } or { known: false, near: "Documents" } for a close one ("Document",
  // "Documnets": one letter off, two in a long name), or { known: false } when nothing is close.
  const plainName = raw => raw.replace(/^(the|my)\s+/i, "").replace(/\s+(folder|directory|dir)$/i, "").trim();
  function editDistance(a, b) {
    const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
    for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return d[a.length][b.length];
  }
  function folder(raw, extra = []) {
    const low = plainName(raw).toLowerCase();
    if (HERE.test(low) || low === "home" || low === "~") return { known: true };
    const names = [...Object.values(XDG), ...extra];
    if (names.some(n => n.toLowerCase() === low)) return { known: true };
    let near = null, best = 99;
    for (const n of names) {
      const d = editDistance(low, n.toLowerCase());
      if (d < best && d <= (n.length > 6 ? 2 : 1)) { best = d; near = n; }
    }
    return { known: false, near };
  }
  // a folder named after in / inside / into / to… that the slot model didn't mark: only one this
  // device knows, or a close one ("inside document"), never any word ("a file to track expenses")
  function guessFolder(text, extra = [], taken = []) {
    const RE = /\b(?:in|inside|into|to|under|within|from|on)\s+(?:the\s+|my\s+)?([A-Za-z][\w-]*)/gi;
    const used = taken.filter(v => typeof v === "string").map(v => v.toLowerCase());
    for (const m of text.matchAll(RE)) {
      const w = m[1];
      if (used.some(u => u.split(/\s+/).includes(w.toLowerCase()))) continue;
      const f = folder(w, extra);
      if (f.known || f.near) return w;
    }
    return null;
  }
  const FOLDERS_KEY = "ptilu.folders.v1";
  const folders = {
    get: (store, agent) => { try { return JSON.parse((store && store.getItem(FOLDERS_KEY)) || "null") || agent._folders || []; } catch { return agent._folders || []; } },
    add: (store, agent, name) => { const all = [...new Set([...folders.get(store, agent), name])]; agent._folders = all; try { if (store) store.setItem(FOLDERS_KEY, JSON.stringify(all)); } catch { /* kept in memory only */ } },
  };

  // text made safe for the command line: single quotes, so nothing in it ($, `, ;, &) is run.
  // A path's leading $HOME stays outside the quotes so the shell still expands it.
  const sq = t => (/^[\w./:-]+$/.test(t) ? t : "'" + t.replace(/'/g, "'\\''") + "'");
  const quote = p => (p.startsWith("$HOME") ? "$HOME" + (p.length > 5 ? sq(p.slice(5)) : "") : sq(p));


  // ---------- network: the place lookup and the requests declared in skill.md ----------
  // a path into JSON: "current.temperature_2m", "results[0].name"
  const getPath = (obj, path) => path.replace(/\[(\d+)\]/g, ".$1").split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);
  // a value as it goes into a request: a list entry's output, a date's ISO form, else the words
  // a range goes out as an ISO interval ("2026-10-17/2026-10-18")
  const plain = v => (v && typeof v === "object" ? v.out ?? v.value ?? (v.from && v.to ? v.from + "/" + v.to : null) ?? v.key ?? v.text ?? "" : v ?? "");
  const fillIn = (t, vars) => t.replace(/\{([\w.]+)\}/g, (_, path) => plain(getPath(vars, path)));
  // a place → coordinates and time zone (Open-Meteo place search), cached per agent
  async function geocode(agent, name) {
    const key = name.toLowerCase();
    agent.geoCache = agent.geoCache || {};
    if (key in agent.geoCache) return agent.geoCache[key];
    if (!agent.fetch) throw new Error("no network access");
    const r = await agent.fetch("https://geocoding-api.open-meteo.com/v1/search?count=5&language=en&format=json&name=" + encodeURIComponent(name));
    if (!r.ok) throw new Error("place search answered " + r.status);
    // several places share a name ("Paris", "Hong"): prefer the most populated one
    const g = ((await r.json()).results || []).reduce((best, x) => (!best || (x.population || 0) > (best.population || 0) ? x : best), null);
    const out = g ? { name: g.name, region: [g.admin1, g.country].filter(x => x && x !== g.name).join(", "), lat: g.latitude, lon: g.longitude, timezone: g.timezone } : null;
    agent.geoCache[key] = out;
    return out;
  }
  // the call under "## Request": {slot} from the sentence, {place.lat} after a place lookup.
  // Secret values (an API key, a private topic) never show in the trace.
  async function request(agent, sk, vars, ctx) {
    const r = sk.request;
    if (!r) throw new Error(sk.file + " has no ## Request section");
    vars = { ...vars };
    const all = [r.url, ...Object.values(r.query), ...Object.values(r.headers || {}), ...Object.values(r.body || {})];
    let place; // stays undefined when the request needs no place; null means the place wasn't found
    if (all.some(v => v.includes("{place."))) {
      const me = agent.mem(), same = typeof vars.place === "string" && me.place && vars.place.toLowerCase() === me.place.name.toLowerCase();
      place = same && me.place.lat != null ? me.place : typeof vars.place === "string" ? await geocode(agent, vars.place) : vars.place;
      if (!place) return { place: null, answer: {}, json: null };
      if (same && me.place.lat == null) agent.setMem({ ...me, place }); // home found on the map
      vars.place = place;
    }
    const q = Object.entries(r.query).map(([k, v]) => k + "=" + encodeURIComponent(fillIn(v, vars)));
    const url = fillIn(r.url, vars) + (q.length ? (r.url.includes("?") ? "&" : "?") + q.join("&") : "");
    const headers = Object.fromEntries(Object.entries(r.headers || {}).map(([k, v]) => [k, fillIn(v, vars)]));
    let body;
    if (r.body) {
      const obj = {};
      for (const [k, v] of Object.entries(r.body)) {
        const keys = k.split("."), last = keys.pop();
        keys.reduce((o, x) => (o[x] = o[x] || {}), obj)[last] = fillIn(v, vars);
      }
      body = JSON.stringify(obj);
      headers["Content-Type"] = headers["Content-Type"] || "application/json";
    }
    const secrets = Object.entries(sk.slots || {}).filter(([, s]) => s.type === "secret").map(([k]) => String(plain(vars[k]))).filter(Boolean);
    const hide = t => secrets.reduce((t, x) => t.split(x).join("•••").split(encodeURIComponent(x)).join("•••"), t);
    ctx.exec(hide(r.method + " " + url.replace(/^https?:\/\//, "").replace(/%2C/g, ",") + (body ? " " + body : "")));
    if (!agent.fetch) throw new Error("no network access");
    const opts = { method: r.method, headers, body };
    const res = r.method === "GET" && !Object.keys(headers).length ? await agent.fetch(url) : await agent.fetch(url, opts);
    if (!res.ok) throw Object.assign(new Error(new URL(url).host + " answered " + res.status), { status: res.status });
    let json = null;
    try { json = await res.json(); } catch { json = null; } // an empty or plain-text answer is fine for a push
    const answer = pick(sk, json, ctx);
    // a field marked required that the answer doesn't have: the thing asked for wasn't found
    const missing = Object.values(sk.answer || {}).some(a => a.required && getPath(json, a.path) == null);
    return { place: missing ? null : place, answer, json };
  }
  // "## Answer": the fields that become reply values
  function pick(sk, json, ctx) {
    const out = {};
    for (const [name, a] of Object.entries(sk.answer || {})) {
      let v = getPath(json, a.path);
      if (a.round && typeof v === "number") v = Math.round(v);
      if (a.via && v != null) v = ctx.lookup(a.via, v) ?? v;
      out[name] = v ?? "?";
    }
    return out;
  }

  // the place a sentence names: the tagged words, extended to the rest of a multi-word name
  // ("hong" in "time in hong kong now" → "hong kong"), stopping at words that aren't part of it
  const NOT_PLACE = /^(now|right|today|tonight|tomorrow|please|on|at|this|next|in|for|and|then|later|morning|afternoon|evening|weekend|monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d.*)$/i;
  function placeIn(text, tagged) {
    if (!tagged) return null;
    const at = text.toLowerCase().indexOf(tagged.toLowerCase());
    if (at < 0) return tagged;
    const words = text.slice(at + tagged.length).replace(/[?!.,;].*$/, "").split(/\s+/).filter(Boolean);
    const more = [];
    for (const w of words) { if (NOT_PLACE.test(w)) break; more.push(w); }
    return [text.slice(at, at + tagged.length), ...more].join(" ").trim();
  }

  // ---------- what the agent remembers about the person: on this device only ----------
  // secret values a skill asked for once (an API key, a private topic): on this device only,
  // never sent to the model, never shown in the trace
  const SECRET_KEY = "ptilu.secrets.v1";
  const secrets = {
    all: (store, agent) => { try { return JSON.parse((store && store.getItem(SECRET_KEY)) || "null") || agent._secrets || {}; } catch { return agent._secrets || {}; } },
    get: (store, agent, k) => secrets.all(store, agent)[k] || secrets.all(store, agent)[k.split(".").pop()] || null, // "skill.name"; a bare name from before secrets were per skill
    set: (store, agent, k, v) => { const all = { ...secrets.all(store, agent), [k]: v }; agent._secrets = all; try { if (store) store.setItem(SECRET_KEY, JSON.stringify(all)); } catch { /* kept in memory only */ } },
  };
  const ME_KEY = "minios.me.v1"; // old name kept on purpose: name and place survive the rename
  const me = {
    get: (store, agent) => { try { return JSON.parse((store && store.getItem(ME_KEY)) || "null") || agent._mem || {}; } catch { return agent._mem || {}; } },
    set: (store, agent, m) => { agent._mem = m; try { if (store) store.setItem(ME_KEY, JSON.stringify(m)); } catch { /* kept in memory only */ } },
  };

  return { net: { geocode, request }, me, secrets, places: { placeIn }, fmt: { DAYS, MONTHS, pad2, cap, plural, day0, daysApart, fromIso, isoMinute, clock, dayText, whenText, durWords, ruleWords, onCalendar },
    files: { where, quote, folder, guessFolder, plainName, folders } };
})();
if (typeof module !== "undefined") module.exports = NLUServices;
