// Rule-based date / time / duration / recurrence entities. No model, no dependencies.
// Shared by every skill that needs time: reminders, timers, calendar, "what day is ...".
// Usage: NLUEntities.parse("remind me next friday at 3pm", { now: new Date() })
// Every result carries `ambiguous` + `alternatives` so the dialogue can ask instead of guessing.

const NLUEntities = (() => {
  // ---------- numbers ----------
  const SMALL_N = { zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
    eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19 };
  const TENS_N = { twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60 };
  const SMALL = "thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve";
  const NUM = `(?:\\d+(?:[.,]\\d+)?|(?:twenty|thirty|forty|fifty|sixty)(?:[\\s-](?:one|two|three|four|five|six|seven|eight|nine))?|a\\s+couple\\s+of|couple\\s+of|a\\s+couple|a\\s+few|few|several|${SMALL}|an?)`;
  const HOURW = "one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve";
  const ORD_N = { first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7, eighth: 8, ninth: 9, tenth: 10,
    eleventh: 11, twelfth: 12, thirteenth: 13, fourteenth: 14, fifteenth: 15, sixteenth: 16, seventeenth: 17, eighteenth: 18,
    nineteenth: 19, twentieth: 20, thirtieth: 30 };
  const ORDW = "(?:twenty|thirty)[\\s-](?:first|second|third|fourth|fifth|sixth|seventh|eighth|ninth)|thirtieth|twentieth|nineteenth|eighteenth|seventeenth|sixteenth|fifteenth|fourteenth|thirteenth|twelfth|eleventh|tenth|ninth|eighth|seventh|sixth|fifth|fourth|third|second|first";
  // "21", "21st", "twenty-first" → 21
  function ordNum(s) {
    s = s.toLowerCase().replace(/(st|nd|rd|th)$/, m => (/^\d/.test(s) ? "" : m));
    if (/^\d+$/.test(s)) return +s;
    const [a, b] = s.split(/[\s-]/);
    return b ? (a === "twenty" ? 20 : 30) + ORD_N[b] : ORD_N[a];
  }

  function num(s) {
    s = s.trim().toLowerCase().replace(/\s+/g, " ");
    if (/^\d/.test(s)) return parseFloat(s.replace(",", "."));
    if (/couple/.test(s)) return 2;
    if (/few|several/.test(s)) return 3;
    if (s === "a" || s === "an") return 1;
    const [t, u] = s.split(/[\s-]/);
    if (t in TENS_N) return TENS_N[t] + (u ? SMALL_N[u] : 0);
    return SMALL_N[s];
  }

  // ---------- durations ----------
  const UNIT = "seconds?|secs?|minutes?|mins?|hours?|hrs?|days?|weeks?|wks?|fortnights?|months?|years?|yrs?";
  const unitKey = u => {
    u = u.toLowerCase();
    if (/^s/.test(u)) return "seconds";
    if (/^mi|^m$/.test(u)) return "minutes";
    if (/^h/.test(u)) return "hours";
    if (/^d/.test(u)) return "days";
    if (/^w/.test(u)) return "weeks";
    if (/^f/.test(u)) return "fortnight";
    if (/^mo/.test(u)) return "months";
    return "years";
  };
  const comp = named => {
    const g = n => (named ? `?<${n}>` : "?:");
    return [
      `(${g("n1")}${NUM})\\s+and\\s+a\\s+half\\s+(${g("u1")}${UNIT})\\b`,
      `(?:an?\\s+)?half\\s+(?:an?\\s+)?(${g("u2")}hour|day|minute|week|month|year)\\b`,
      `(${g("q")}(?:a\\s+)?quarter\\s+(?:of\\s+)?an?\\s+hour)\\b`,
      `(${g("hh")}\\d+)\\s*h\\s*(${g("hm")}\\d+)\\s*(?:m|min|mins)?\\b`,
      `(${g("n3")}${NUM})[\\s-]+(${g("u3")}${UNIT})\\b(${g("hf")}\\s+and\\s+a\\s+half)?`,
      `(${g("n4")}\\d+)\\s*(${g("u4")}h|m|min|mins|s|sec|secs|d)\\b`,
    ].join("|");
  };
  const COMP = `(?:${comp(false)})`;
  const DUR = `${COMP}(?:(?:\\s*,\\s*|\\s+and\\s+|\\s+)${COMP})*`;
  const COMP_RE = new RegExp(comp(true), "gi");
  const DOWN = { years: ["months", 12], months: ["days", 30], weeks: ["days", 7], days: ["hours", 24], hours: ["minutes", 60], minutes: ["seconds", 60] };

  function parseDuration(s) {
    const d = { years: 0, months: 0, weeks: 0, days: 0, hours: 0, minutes: 0, seconds: 0 };
    const add = (unit, amount) => {
      if (unit === "fortnight") { unit = "weeks"; amount *= 2; }
      const whole = Math.floor(amount), frac = amount - whole;
      d[unit] += whole;
      if (frac > 1e-9 && DOWN[unit]) add(DOWN[unit][0], frac * DOWN[unit][1]);
      else if (frac > 1e-9) d[unit] += frac;
    };
    let any = false;
    for (const m of s.matchAll(COMP_RE)) {
      const x = m.groups;
      any = true;
      if (x.n1) add(unitKey(x.u1), num(x.n1) + 0.5);
      else if (x.u2) add(unitKey(x.u2), 0.5);
      else if (x.q) add("minutes", 15);
      else if (x.hh) { add("hours", +x.hh); add("minutes", +x.hm); }
      else if (x.n3) add(unitKey(x.u3), num(x.n3) + (x.hf ? 0.5 : 0));
      else if (x.n4) add(unitKey(x.u4), +x.n4);
    }
    return any ? d : null;
  }
  const subDay = d => d.hours || d.minutes || d.seconds;
  function shift(now, d, sign = 1) {
    const y = now.getFullYear() + sign * d.years, mo = now.getMonth() + sign * d.months;
    const day = Math.min(now.getDate(), daysIn(y, mo));
    return new Date(y, mo, day + sign * (d.days + 7 * d.weeks), now.getHours() + sign * d.hours,
      now.getMinutes() + sign * d.minutes, now.getSeconds() + sign * Math.round(d.seconds));
  }
  function durText(d) {
    const out = [];
    for (const [k, l] of [["years", "y"], ["months", "mo"], ["weeks", "w"], ["days", "d"], ["hours", "h"], ["minutes", "min"], ["seconds", "s"]])
      if (d[k]) out.push(`${+d[k].toFixed(2)} ${l}`);
    return out.join(" ");
  }
  const durSeconds = d => Math.round(((((d.years * 365 + d.months * 30 + d.weeks * 7 + d.days) * 24 + d.hours) * 60 + d.minutes) * 60) + d.seconds);

  // ---------- calendar helpers (local time, weeks start Monday) ----------
  const daysIn = (y, m) => new Date(y, m + 1, 0).getDate();
  const day0 = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  const dow = d => (d.getDay() + 6) % 7; // Mon=0
  const weekStart = d => addDays(day0(d), -dow(d));
  const sameDay = (a, b) => a && b && a.getTime() === b.getTime();

  const WD = { monday: 0, mon: 0, tuesday: 1, tues: 1, tue: 1, wednesday: 2, wed: 2, thursday: 3, thurs: 3, thur: 3,
    friday: 4, fri: 4, saturday: 5, sunday: 6 };
  const WD_RE = "monday|tuesday|wednesday|thursday|friday|saturday|sunday|tues|thurs|thur|mon|wed|fri";
  const MONTHS = { january: 0, jan: 0, february: 1, feb: 1, march: 2, mar: 2, april: 3, apr: 3, may: 4, june: 5, jun: 5,
    july: 6, jul: 6, august: 7, aug: 7, september: 8, sept: 8, sep: 8, october: 9, oct: 9, november: 10, nov: 10, december: 11, dec: 11 };
  const MO_RE = "january|february|march|april|may|june|july|august|september|october|november|december|sept|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec";
  const RR_DAY = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"];

  // a date with no year: this year, or next year if it already passed
  function futureDate(now, m, d, y) {
    if (y) return new Date(y, m, d);
    const t = new Date(now.getFullYear(), m, d);
    return t < day0(now) ? new Date(now.getFullYear() + 1, m, d) : t;
  }
  const validDMY = (y, m, d) => m >= 0 && m < 12 && d >= 1 && d <= daysIn(y, m);

  // ---------- rules ----------
  // Each rule returns a "part"; adjacent parts (date + time, recurrence + time ...) are merged afterwards.
  const DAYPART_HOUR = { morning: 9, afternoon: 15, evening: 19, night: 21, tonight: 20 };
  const R = [];
  const rule = (src, fn) => R.push({ re: new RegExp(src, "gi"), fn });

  rule(`\\b(?:right\\s+)?now\\b`, (m, c) => ({ kind: "instant", date: c.now }));
  rule(`\\b(?:in|within|after)\\s+(?:the\\s+next\\s+)?(${DUR})`, (m, c) => rel(c, m[1], 1));
  rule(`(${DUR})\\s+(?:from\\s+now|from\\s+today|later)\\b`, (m, c) => rel(c, m[1], 1));
  rule(`(${DUR})\\s+ago\\b`, (m, c) => rel(c, m[1], -1));
  rule(`\\b(?:for\\s+)?(${DUR})`, (m) => { const d = parseDuration(m[1]); return d && { kind: "duration", dur: d }; });
  function rel(c, s, sign) {
    const d = parseDuration(s);
    if (!d) return null;
    const t = shift(c.now, d, sign);
    return subDay(d) ? { kind: "instant", date: t } : { kind: "date", date: day0(t) };
  }

  rule(`\\b(?:the\\s+)?day\\s+after\\s+tomorrow\\b`, (m, c) => ({ kind: "date", date: addDays(day0(c.now), 2) }));
  rule(`\\b(?:the\\s+)?day\\s+before\\s+yesterday\\b`, (m, c) => ({ kind: "date", date: addDays(day0(c.now), -2) }));
  rule(`\\b(today|tonight|tomorrow|tomorow|tommorow|tmrw|tmr|yesterday)\\b`, (m, c) => {
    const w = m[1].toLowerCase(), off = w === "today" || w === "tonight" ? 0 : w === "yesterday" ? -1 : 1;
    return { kind: "date", date: addDays(day0(c.now), off), daypart: w === "tonight" ? "tonight" : null };
  });
  rule(`\\b(?:(this|in\\s+the|at)\\s+)?(morning|afternoon|evening|night)\\b`, (m, c) =>
    ({ kind: "daypart", name: m[2].toLowerCase(), date: m[1] && /this/i.test(m[1]) ? day0(c.now) : null }));

  // weekdays: "friday", "this friday", "next friday", "last friday", "friday next week"
  rule(`\\b(?:(next|this|coming|last|past|on)\\s+)?(${WD_RE})\\b(?:\\s+(next\\s+week|this\\s+week|week))?`, (m, c) => {
    const mod = (m[1] || "").toLowerCase(), target = WD[m[2].toLowerCase()], suffix = (m[3] || "").toLowerCase();
    const today = day0(c.now);
    let ahead = (target - dow(today) + 7) % 7;
    if (mod === "last" || mod === "past") return { kind: "date", date: addDays(today, -(((dow(today) - target + 7) % 7) || 7)) };
    if (mod === "this" && ahead === 0) return { kind: "date", date: today };
    const coming = addDays(today, ahead || 7);
    const inNextWeek = addDays(weekStart(today), 7 + target);
    if (suffix === "this week") return { kind: "date", date: addDays(weekStart(today), target) };
    if (suffix) return { kind: "date", date: inNextWeek };
    if (mod === "next") {
      // "next friday" on a Monday: the 16th or the 23rd? Both readings are common, so flag it.
      return sameDay(coming, inNextWeek)
        ? { kind: "date", date: coming }
        : { kind: "date", date: c.opts.nextWeekday === "coming" ? coming : inNextWeek,
            ambiguous: true, alternatives: [c.opts.nextWeekday === "coming" ? inNextWeek : coming] };
    }
    return { kind: "date", date: coming };
  });
  // "on mondays" → recurrence
  rule(`\\bon\\s+(${WD_RE})s\\b`, (m) => ({ kind: "recur", freq: "WEEKLY", interval: 1, byday: [RR_DAY[WD[m[1].toLowerCase()]]] }));

  // periods: next week / this month / last year / next weekend / the week after next
  rule(`\\b(next|this|coming|last|past|the\\s+following|following)\\s+(week|weekend|month|year)\\b`, (m, c) =>
    period(c, m[2].toLowerCase(), { next: 1, coming: 1, following: 1, this: 0, last: -1, past: -1 }[m[1].toLowerCase().replace(/^the\s+/, "")]));
  rule(`\\bthe\\s+week\\s+after\\s+next\\b`, (m, c) => period(c, "week", 2));
  function period(c, unit, off) {
    const t = day0(c.now);
    if (unit === "week") { const s = addDays(weekStart(t), 7 * off); return { kind: "range", from: s, to: addDays(s, 6), grain: "week" }; }
    if (unit === "weekend") {
      const sat = addDays(weekStart(t), 5 + 7 * off);
      const r = { kind: "range", from: sat, to: addDays(sat, 1), grain: "weekend" };
      if (off === 1 && dow(t) < 5) { // "next weekend" said on a weekday: this coming one, or the one after?
        const coming = c.opts.nextWeekday === "coming";
        const other = addDays(sat, -7);
        r.ambiguous = true;
        if (coming) { r.from = other; r.to = addDays(other, 1); r.alternatives = [sat]; } else r.alternatives = [other];
      }
      return r;
    }
    if (unit === "month") { const s = new Date(t.getFullYear(), t.getMonth() + off, 1); return { kind: "range", from: s, to: new Date(s.getFullYear(), s.getMonth() + 1, 0), grain: "month" }; }
    const y = t.getFullYear() + off;
    return { kind: "range", from: new Date(y, 0, 1), to: new Date(y, 11, 31), grain: "year" };
  }
  // end / beginning / middle of (next) week|month|year
  rule(`\\b(?:by\\s+)?(?:the\\s+)?(end|beginning|start|middle|mid)\\s*(?:of|-)\\s*(?:the\\s+)?(?:(next|this|last)\\s+)?(week|month|year)\\b`, (m, c) => {
    const p = period(c, m[3].toLowerCase(), { next: 1, last: -1 }[(m[2] || "").toLowerCase()] || 0);
    const w = m[1].toLowerCase();
    if (w === "beginning" || w === "start") return { kind: "date", date: p.from };
    if (w === "end") {
      if (p.grain === "week") return { kind: "date", date: addDays(p.from, 4), ambiguous: true, alternatives: [p.to], note: "end of week = Friday (or Sunday?)" };
      return { kind: "date", date: p.to };
    }
    if (p.grain === "week") return { kind: "date", date: addDays(p.from, 2) };
    if (p.grain === "month") return { kind: "date", date: new Date(p.from.getFullYear(), p.from.getMonth(), 15) };
    return { kind: "date", date: new Date(p.from.getFullYear(), 6, 1) };
  });

  // holidays (fixed dates, and Easter computed)
  function easter(y) { // anonymous Gregorian algorithm
    const a = y % 19, b = Math.floor(y / 100), c2 = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25),
      g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c2 / 4), k = c2 % 4,
      l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
    return new Date(y, Math.floor((h + l - 7 * m + 114) / 31) - 1, ((h + l - 7 * m + 114) % 31) + 1);
  }
  const HOLIDAYS = {
    "christmas eve": [11, 24], "christmas": [11, 25], "christmas day": [11, 25], "xmas": [11, 25], "boxing day": [11, 26],
    "new year's eve": [11, 31], "new years eve": [11, 31], "new year's day": [0, 1], "new years day": [0, 1], "new year": [0, 1], "new year's": [0, 1],
    "valentine's day": [1, 14], "valentines day": [1, 14], "halloween": [9, 31], "all saints": [10, 1], "may day": [4, 1],
    "easter": "easter", "easter sunday": "easter", "easter monday": 1, "good friday": -2,
  };
  const HOL_RE = Object.keys(HOLIDAYS).sort((a, b) => b.length - a.length).map(k => k.replace(/'/g, "['’]?")).join("|");
  rule(`\\b(?:on\\s+)?(${HOL_RE})\\b`, (m, c) => {
    const key = m[1].toLowerCase().replace(/’/g, "'"), h = HOLIDAYS[key] ?? HOLIDAYS[key.replace("'", "")];
    const on = y => (Array.isArray(h) ? new Date(y, h[0], h[1]) : addDays(easter(y), h === "easter" ? 0 : h));
    let d = on(c.now.getFullYear());
    if (d < day0(c.now)) d = on(c.now.getFullYear() + 1);
    return { kind: "date", date: d, holiday: key };
  });
  // "the first monday of next month", "the last friday of october"
  rule(`\\b(?:the\\s+)?(first|second|third|fourth|fifth|last|1st|2nd|3rd|4th|5th)\\s+(${WD_RE})\\s+(?:of|in)\\s+(?:(?:the\\s+)?(next|this|last)\\s+month|(${MO_RE})(?:\\s+(\\d{4}))?)`, (m, c) => {
    const n = m[1].toLowerCase(), wd = WD[m[2].toLowerCase()], now = c.now;
    let y = now.getFullYear(), mo;
    if (m[3]) mo = now.getMonth() + { next: 1, this: 0, last: -1 }[m[3].toLowerCase()];
    else { mo = MONTHS[m[4].toLowerCase()]; if (m[5]) y = +m[5]; else if (mo < now.getMonth()) y++; }
    const first = new Date(y, mo, 1);
    if (n === "last") { let d = new Date(y, mo + 1, 0); while (dow(d) !== wd) d = addDays(d, -1); return { kind: "date", date: d }; }
    const k = { first: 1, "1st": 1, second: 2, "2nd": 2, third: 3, "3rd": 3, fourth: 4, "4th": 4, fifth: 5, "5th": 5 }[n];
    const d = addDays(first, ((wd - dow(first) + 7) % 7) + 7 * (k - 1));
    return d.getMonth() === first.getMonth() ? { kind: "date", date: d } : null;
  });
  // "the last day of the year", "the first day of next month"
  rule(`\\b(?:the\\s+)?(first|last)\\s+day\\s+of\\s+(?:the\\s+)?(?:(next|this|last)\\s+)?(week|month|year)\\b`, (m, c) => {
    const p = period(c, m[3].toLowerCase(), { next: 1, last: -1 }[(m[2] || "").toLowerCase()] || 0);
    return { kind: "date", date: m[1].toLowerCase() === "first" ? p.from : p.to };
  });
  // "tuesday the 20th", "friday the 13th": the next date where both match
  rule(`\\b(?:on\\s+)?(${WD_RE})\\s+(?:the\\s+)?(\\d{1,2}(?:st|nd|rd|th)?|${ORDW})\\b(?:\\s+of\\s+(${MO_RE}))?`, (m, c) => {
    const wd = WD[m[1].toLowerCase()], d = ordNum(m[2]), now = c.now;
    if (!d || d > 31) return null;
    for (let k = 0; k < 24; k++) {
      const y = now.getFullYear(), mo = m[3] ? MONTHS[m[3].toLowerCase()] + 12 * k : now.getMonth() + k;
      const t = new Date(y, mo, d);
      if (t.getDate() === d && t >= day0(now) && dow(t) === wd) return { kind: "date", date: t };
    }
    return null;
  });
  // "this time next week", "this time tomorrow"
  rule(`\\bthis\\s+time\\s+(tomorrow|next\\s+(week|month|year))\\b`, (m, c) => {
    const n = c.now, u = (m[2] || "day").toLowerCase();
    const t = new Date(n.getFullYear() + (u === "year"), n.getMonth() + (u === "month"), n.getDate() + (u === "day" ? 1 : u === "week" ? 7 : 0), n.getHours(), n.getMinutes());
    return { kind: "instant", date: t };
  });

  // absolute dates
  rule(`\\b(?:on\\s+)?(?:the\\s+)?(\\d{1,2}|${ORDW})(?:st|nd|rd|th)?(?:\\s+of)?\\s+(${MO_RE})\\b(?:,?\\s+(\\d{4}))?`, (m, c) => dm(c, ordNum(m[1]), MONTHS[m[2].toLowerCase()], m[3]));
  rule(`\\b(?:on\\s+)?(${MO_RE})\\s+(?:the\\s+)?(\\d{1,2})(?:st|nd|rd|th)?\\b(?:,?\\s+(\\d{4}))?`, (m, c) => dm(c, +m[2], MONTHS[m[1].toLowerCase()], m[3]));
  function dm(c, d, mo, y) {
    const t = futureDate(c.now, mo, d, y && +y);
    return validDMY(t.getFullYear(), mo, d) ? { kind: "date", date: t } : null;
  }
  rule(`\\b(in\\s+|during\\s+|next\\s+|this\\s+|last\\s+)?(${MO_RE})\\b(?:\\s+(\\d{4}))?`, (m, c) => {
    const pre = (m[1] || "").trim().toLowerCase(), mo = MONTHS[m[2].toLowerCase()], y = m[3] && +m[3];
    if (mo === 4 && m[2].toLowerCase() === "may" && !pre && !y) return null; // "may" is usually a verb
    if (!pre && !y && m[2].length <= 3) return null;                          // bare "mar", "dec": too risky
    const now = c.now;
    let year = y || now.getFullYear();
    if (!y && (pre === "next" ? mo <= now.getMonth() : pre === "last" ? false : mo < now.getMonth())) year++;
    if (!y && pre === "last") year = mo < now.getMonth() ? now.getFullYear() : now.getFullYear() - 1;
    return { kind: "range", from: new Date(year, mo, 1), to: new Date(year, mo + 1, 0), grain: "month" };
  });
  // "the 20th", "on the third" (an ordinal word needs "on": "the first file" is not a date)
  rule(`\\b(?:on\\s+)?the\\s+(\\d{1,2})(?:st|nd|rd|th)\\b|\\bon\\s+the\\s+(${ORDW})\\b`, (m, c) => {
    const d = ordNum(m[1] || m[2]), now = c.now;
    for (let k = 0; k < 3; k++) {
      const y = now.getFullYear(), mo = now.getMonth() + k;
      const t = new Date(y, mo, d);
      if (d <= daysIn(y, mo) && t >= day0(now)) return { kind: "date", date: t };
    }
    return null;
  });
  rule(`\\b(\\d{4})-(\\d{1,2})-(\\d{1,2})\\b`, (m) => validDMY(+m[1], +m[2] - 1, +m[3]) ? { kind: "date", date: new Date(+m[1], +m[2] - 1, +m[3]) } : null);
  rule(`\\b(\\d{1,2})(?:/(\\d{1,2})(?:/(\\d{2,4}))?|\\.(\\d{1,2})\\.(\\d{2,4})?)(?![\\d.]*\\s*(?:${UNIT}|am|pm|h)\\b)`, (m, c) => {
    const a = +m[1], b = +(m[2] || m[4]), ys = m[3] || m[5];
    const y = ys ? (ys.length === 2 ? 2000 + +ys : +ys) : null;
    const dmy = c.opts.dateOrder !== "MDY";
    const [d, mo] = dmy ? [a, b - 1] : [b, a - 1];
    const t = futureDate(c.now, mo, d, y);
    if (!validDMY(t.getFullYear(), mo, d)) return null;
    const r = { kind: "date", date: t };
    if (a <= 12 && b <= 12 && a !== b && m[2]) { // slash form with both ≤ 12: 3/4 = 3 April or 4 March?
      const [d2, mo2] = dmy ? [b, a - 1] : [a, b - 1];
      r.ambiguous = true; r.alternatives = [futureDate(c.now, mo2, d2, y)];
    }
    return r;
  });
  rule(`\\b(?:in|during)\\s+(\\d{4})\\b`, (m) => ({ kind: "range", from: new Date(+m[1], 0, 1), to: new Date(+m[1], 11, 31), grain: "year" }));

  // times
  const MER = `(am|pm|a\\.m\\.|p\\.m\\.)`;
  const merOf = s => (s ? (/^p/i.test(s) ? "pm" : "am") : null);
  rule(`\\b(at\\s+|@\\s*|by\\s+|around\\s+)?(\\d{1,2})([:h.])(\\d{2})(?!\\d)\\s*${MER}?(?![a-z])`, (m) => {
    const h = +m[2], mi = +m[4], sep = m[3];
    if (h > 23 || mi > 59) return null;
    if (sep !== ":" && !m[1] && !m[5] && h < 13) return null; // "1h30" / "1.30" alone is a duration or a number
    return { kind: "time", h, m: mi, mer: merOf(m[5]) };
  });
  rule(`\\b(?:at\\s+|by\\s+|around\\s+)?(\\d{1,2})\\s*(?:${MER}|o'?clock)(?![a-z])`, (m) =>
    +m[1] <= 12 || !m[2] ? (+m[1] <= 23 ? { kind: "time", h: +m[1], m: 0, mer: merOf(m[2]) } : null) : null);
  rule(`\\b(at\\s+)?(\\d{1,2})h\\b(?!\\s*\\d)`, (m) => (m[1] || +m[2] >= 13) && +m[2] <= 23 ? { kind: "time", h: +m[2], m: 0, mer: null } : null);
  rule(`\\b(?:at|around|by)\\s+(\\d{1,2}|${HOURW})\\b(?![:.h/]\\d)`, (m) => {
    const h = num(m[1]);
    return h <= 23 ? { kind: "time", h, m: 0, mer: null } : null;
  });
  rule(`\\b(?:at\\s+)?half\\s+(\\d{1,2}|${HOURW})\\b(?!\\s*(?:an?\\s+)?(?:hour|day|minute|week|month|year|past|after|to|till))`, (m) => {
    const h = num(m[1]);
    return h >= 1 && h <= 12 ? { kind: "time", h, m: 30, mer: null } : null;
  });
  rule(`\\b(?:at\\s+)?(noon|midday|midnight)\\b`, (m) => /midnight/i.test(m[1]) ? { kind: "time", h: 0, m: 0, mer: "am", midnight: true } : { kind: "time", h: 12, m: 0, mer: "pm" });
  rule(`\\b(?:at\\s+)?(?:a\\s+)?(half|quarter|\\d{1,2}|${SMALL}|twenty(?:[\\s-](?:one|two|three|four|five|six|seven|eight|nine))?)(?:\\s+minutes?)?\\s+(past|after|to|till|before)\\s+(\\d{1,2}|${HOURW})\\b(?:\\s*${MER})?`, (m) => {
    const w = m[1].toLowerCase(), mins = w === "half" ? 30 : w === "quarter" ? 15 : num(w), h = num(m[3]);
    if (mins == null || mins >= 60 || h > 23) return null;
    const after = /past|after/i.test(m[2]);
    if (!after && w === "half") return null;
    return after ? { kind: "time", h, m: mins, mer: merOf(m[4]) } : { kind: "time", h: h - 1 || 12, m: 60 - mins, mer: merOf(m[4]) };
  });

  // recurrence
  rule(`\\b(?:every|each)\\s+(other\\s+)?(?:(${NUM})\\s+)?(day|weekday|weekend|morning|evening|night|week|month|year|hour|minute|days|weeks|months|hours|minutes|(?:${WD_RE})(?:\\s*(?:,|and|&)\\s*(?:${WD_RE}))*)\\b`, (m) => {
    const what = m[3].toLowerCase(), interval = (m[1] ? 2 : 1) * (m[2] ? num(m[2]) : 1);
    const base = { kind: "recur", interval };
    if (/^(day|days)$/.test(what)) return { ...base, freq: "DAILY" };
    if (/^(morning|evening|night)$/.test(what)) return { ...base, freq: "DAILY", daypart: what };
    if (what === "weekday") return { ...base, freq: "WEEKLY", byday: ["MO", "TU", "WE", "TH", "FR"] };
    if (what === "weekend") return { ...base, freq: "WEEKLY", byday: ["SA", "SU"] };
    if (/^weeks?$/.test(what)) return { ...base, freq: "WEEKLY" };
    if (/^months?$/.test(what)) return { ...base, freq: "MONTHLY" };
    if (/^years?$/.test(what)) return { ...base, freq: "YEARLY" };
    if (/^hours?$/.test(what)) return { ...base, freq: "HOURLY" };
    if (/^minutes?$/.test(what)) return { ...base, freq: "MINUTELY" };
    return { ...base, freq: "WEEKLY", byday: what.split(/\s*(?:,|and|&)\s*/).map(x => RR_DAY[WD[x]]) };
  });
  rule(`\\b(daily|nightly|weekly|monthly|yearly|annually|hourly)\\b`, (m) => {
    const w = m[1].toLowerCase();
    return { kind: "recur", interval: 1, freq: w === "nightly" ? "DAILY" : w === "annually" ? "YEARLY" : w.toUpperCase(), daypart: w === "nightly" ? "night" : null };
  });

  // ---------- time resolution ----------
  const PM_HINT = new Set(["afternoon", "evening", "night", "tonight"]);
  function hour24(t, daypart, date, now) {
    let h = t.h, amb = false, alt = null, altNextDay = false;
    if (t.mer === "pm" && h < 12) h += 12;
    else if (t.mer === "am" && h === 12) h = 0;
    else if (!t.mer && h >= 1 && h <= 12) {
      if (daypart && PM_HINT.has(daypart)) { if (!(daypart === "night" && h <= 4) && h < 12) h += 12; }
      else if (daypart === "morning") { if (h === 12) h = 0; }
      else if (date && sameDay(date, day0(now))) {
        // today, no am/pm: take the next of the two readings that is still ahead
        const am = new Date(date.getFullYear(), date.getMonth(), date.getDate(), h % 12, t.m);
        const pm = new Date(date.getFullYear(), date.getMonth(), date.getDate(), (h % 12) + 12, t.m);
        if (am > now) { h = h % 12; amb = true; alt = (h % 12) + 12; }
        else if (pm > now) { h = (h % 12) + 12; amb = true; alt = h - 12; altNextDay = true; } // tonight, or tomorrow morning
        else if (h <= 6) h = (h % 12) + 12;                 // both passed: tomorrow, 1–6 → afternoon
        else if (h <= 11) { amb = true; alt = h + 12; }      // tomorrow, 7–11 → morning, but ask
        else h = 12;
      } else if (h <= 6) h += 12;            // 1–6 → afternoon
      else if (h <= 11) { amb = true; alt = h + 12; } // 7–11 → morning, but ask
    }
    return { h, m: t.m, ambiguous: amb, altHour: alt, altNextDay };
  }

  // ---------- merge + resolve ----------
  const GLUE = /^[\s,]*(?:(?:at|on|in\s+the|the|around|by|from|-|and)[\s,]*)?$/i;

  function parse(text, options = {}) {
    const now = options.now || new Date();
    const c = { now, opts: { nextWeekday: options.nextWeekday || "coming", dateOrder: options.dateOrder || "DMY" } };
    const low = text.toLowerCase();
    let cands = [];
    for (const { re, fn } of R) {
      re.lastIndex = 0;
      for (const m of low.matchAll(re)) {
        const p = fn(m, c);
        if (p) cands.push({ ...p, start: m.index, end: m.index + m[0].length });
      }
    }
    // longest match wins, no overlaps
    cands.sort((a, b) => (b.end - b.start) - (a.end - a.start) || a.start - b.start);
    const taken = [];
    for (const p of cands) if (!taken.some(q => p.start < q.end && q.start < p.end)) taken.push(p);
    taken.sort((a, b) => a.start - b.start);
    // a duration counted from a date: "a week from tomorrow", "three days before christmas"
    for (let i = 0; i + 1 < taken.length; i++) {
      const a = taken[i], b = taken[i + 1];
      const link = /^\s+(from|after|before)\s+$/i.exec(low.slice(a.end, b.start));
      if (a.kind !== "duration" || !link || !(b.kind === "date" || b.kind === "instant")) continue;
      const sign = /before/i.test(link[1]) ? -1 : 1;
      const base = b.kind === "date" ? b.date : b.date;
      const t = shift(base, a.dur, sign);
      taken.splice(i, 2, b.kind === "date" && !subDay(a.dur)
        ? { kind: "date", date: day0(t), start: a.start, end: b.end }
        : { kind: "instant", date: t, start: a.start, end: b.end });
    }
    // group adjacent parts
    const groups = [];
    for (const p of taken) {
      const g = groups[groups.length - 1];
      if (g && GLUE.test(low.slice(g[g.length - 1].end, p.start)) && compatible(g, p)) g.push(p);
      else groups.push([p]);
    }
    return groups.map(g => resolve(g, text, c)).filter(Boolean);
  }
  function compatible(g, p) {
    const kinds = new Set(g.map(x => x.kind));
    if (p.kind === "duration" || kinds.has("duration")) return false;
    if (p.kind === "instant" || kinds.has("instant")) return false;
    if (kinds.has(p.kind) && p.kind !== "daypart") return false;
    if ((p.kind === "date" && kinds.has("range")) || (p.kind === "range" && kinds.has("date"))) return false;
    return true;
  }

  function resolve(g, text, c) {
    const now = c.now;
    const span = text.slice(g[0].start, g[g.length - 1].end);
    const by = k => g.find(p => p.kind === k);
    const base = { text: span, start: g[0].start, end: g[g.length - 1].end };
    const dur = by("duration"), inst = by("instant"), rec = by("recur");
    if (dur) return { ...base, type: "duration", value: durText(dur.dur), seconds: durSeconds(dur.dur), parts: dur.dur };
    if (inst) return { ...base, type: "datetime", value: iso(inst.date, true), grain: "minute", past: inst.date < now && !sameMinute(inst.date, now) };

    const date = by("date"), range = by("range"), time = by("time"), dp = by("daypart");
    const daypart = (dp && dp.name) || (date && date.daypart) || (rec && rec.daypart) || null;

    if (rec) {
      const t = time ? hour24(time, daypart, null, now) : daypart ? { h: DAYPART_HOUR[daypart], m: 0, approx: true } : null;
      const rr = [`FREQ=${rec.freq}`, rec.interval > 1 ? `INTERVAL=${rec.interval}` : "", rec.byday ? `BYDAY=${rec.byday.join(",")}` : "",
        t ? `BYHOUR=${t.h};BYMINUTE=${t.m}` : ""].filter(Boolean).join(";");
      return { ...base, type: "recurrence", rrule: rr, time: t ? pad(t.h) + ":" + pad(t.m) : null, next: nextOccurrence(rec, t, now),
        ambiguous: !!(t && t.ambiguous), alternatives: t && t.ambiguous ? [pad(t.altHour) + ":" + pad(t.m)] : [] };
    }

    let day = date ? date.date : dp && dp.date ? dp.date : range && (time || dp) ? range.from : null;
    let ambiguous = !!((date && date.ambiguous) || (range && range.ambiguous));
    let altDays = (date && date.alternatives) || [];
    const notes = [];
    if (date && date.note) notes.push(date.note);
    if (range && (time || dp)) { ambiguous = true; notes.push(`no day given inside the ${range.grain}, used its first day`); }

    if (!time && !dp && !daypart) {
      if (range) return { ...base, type: "range", grain: range.grain, from: iso(range.from), to: iso(range.to), value: `${iso(range.from)}/${iso(range.to)}`,
        ambiguous, alternatives: (range.alternatives || []).map(s => `${iso(s)}/${iso(addDays(s, Math.round((range.to - range.from) / 864e5)))}`) };
      return { ...base, type: "date", grain: "day", value: iso(day), ambiguous, alternatives: altDays.map(d => iso(d)),
        past: day < day0(now), note: notes.join("; ") || undefined };
    }

    let t, approx = false;
    if (time) {
      t = hour24(time, daypart, day || day0(now), now);
      if (time.midnight) day = addDays(day || day0(now), 1);
    } else { t = { h: DAYPART_HOUR[daypart], m: 0 }; approx = true; }
    if (!day) { // time alone: today if still ahead, otherwise tomorrow
      day = day0(now);
      if (new Date(day.getFullYear(), day.getMonth(), day.getDate(), t.h, t.m) <= now) day = addDays(day, 1);
    }
    const at = new Date(day.getFullYear(), day.getMonth(), day.getDate(), t.h, t.m);
    if (t.ambiguous) { ambiguous = true; }
    const alts = altDays.map(d => iso(new Date(d.getFullYear(), d.getMonth(), d.getDate(), t.h, t.m), true));
    const altDay = t.altNextDay ? addDays(day, 1) : day;
    if (t.ambiguous && t.altHour != null) alts.push(iso(new Date(altDay.getFullYear(), altDay.getMonth(), altDay.getDate(), t.altHour, t.m), true));
    if (approx) notes.push(`"${daypart}" with no time, defaulted to ${pad(t.h)}:00`);
    return { ...base, type: "datetime", grain: approx ? "daypart" : "minute", value: iso(at, true), ambiguous, alternatives: alts,
      past: at < now, note: notes.join("; ") || undefined };
  }

  function nextOccurrence(rec, t, now) {
    const h = t ? t.h : 9, m = t ? t.m : 0;
    for (let k = 0; k < 400; k++) {
      const d = addDays(day0(now), k), at = new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m);
      if (at <= now) continue;
      if (rec.byday && !rec.byday.includes(RR_DAY[dow(d)])) continue;
      return iso(at, true);
    }
    return null;
  }

  const pad = n => String(n).padStart(2, "0");
  const sameMinute = (a, b) => Math.abs(a - b) < 60000;
  function iso(d, withTime) {
    const s = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    return withTime ? `${s}T${pad(d.getHours())}:${pad(d.getMinutes())}` : s;
  }

  return { parse, parseDuration };
})();
if (typeof module !== "undefined") module.exports = NLUEntities;
