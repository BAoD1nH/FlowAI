// src/pages/Tracker.jsx
import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";

/* ---------- helpers (storage) ---------- */
const lsGet = (k, v) => {
	try { return JSON.parse(localStorage.getItem(k) ?? JSON.stringify(v)); } catch { return v; }
};
const lsSet = (k, v) => localStorage.setItem(k, JSON.stringify(v));

/* ---------- time/grid helpers ---------- */
const HOURS = Array.from({ length: 11 }, (_, i) => 8 + i); // 8h -> 18h
const WORK_HOURS = { start: 9, lunch: 12, resume: 13, end: 17 };

function startOfWeek(d = new Date()) {
	const x = new Date(d);
	const day = x.getDay(); // 0..6 (Sun..Sat)
	const diff = (day === 0 ? -6 : 1) - day; // about Monday start
	x.setDate(x.getDate() + diff);
	x.setHours(0, 0, 0, 0);
	return x;
}
function startOfMonth(d = new Date()) {
	const x = new Date(d.getFullYear(), d.getMonth(), 1);
	x.setHours(0, 0, 0, 0);
	return x;
}
function addDays(date, n) {
	const d = new Date(date);
	d.setDate(d.getDate() + n);
	return d;
}
function fmtDate(d) {
	return d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
}
function sameDay(a, b) {
	return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function toISODate(d) {
	return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0).toISOString().slice(0, 10);
}
function isWeekday(d) {
	const day = d.getDay();
	return day >= 1 && day <= 5;
}
function workingDaysBetween(start, endInclusive) {
	const out = [];
	let cur = new Date(start);
	cur.setHours(0,0,0,0);
	const end = new Date(endInclusive);
	end.setHours(0,0,0,0);
	while (cur <= end) {
		if (isWeekday(cur)) out.push(new Date(cur));
		cur.setDate(cur.getDate() + 1);
	}
	return out;
}

/* ---------- natural text parsing ---------- */
function parseDuration(text) {
	if (!text) return null;
	const mH = text.match(/(\d+(?:\.\d+)?)\s*(h|hr|hrs|hour|hours)\b/i);
	if (mH) return Math.max(0.5, parseFloat(mH[1]));
	const mM = text.match(/(\d+)\s*(m|min|mins|minute|minutes)\b/i);
	if (mM) return Math.max(0.5, parseInt(mM[1], 10) / 60);
	return null;
}
function estimateDuration(text) {
	const t = (text || "").toLowerCase();
	if (/\b(research|investigate|read|design|plan|architecture|proposal)\b/.test(t)) return 2;
	if (/\b(implement|code|build|train|integrate|refactor)\b/.test(t)) return 2;
	if (/\b(write|draft|report|doc|document|slides|present)\b/.test(t)) return 1.5;
	if (/\b(test|review|lint|fix|debug)\b/.test(t)) return 1;
	return 1;
}
function smartSplit(title, desc) {
	const raw = `${desc || ""}\n${title || ""}`.replace(/\r/g, "");
	let parts = raw
		.split(/\n|[•\-–]\s+|\d+\.\s+/g)
		.flatMap(s => s.split(/[.;]/g))
		.map(s => s.trim())
		.filter(Boolean);
	parts = Array.from(new Set(parts)); // dedup
	if (!parts.length) {
		parts = [
			`Phân tích yêu cầu cho “${title || "Mục tiêu"}”`,
			"Thực hiện phần chính",
			"Tổng hợp & viết báo cáo"
		];
	}
	return parts.slice(0, 7); // tránh quá dài
}

/* ---------- scheduling ---------- */
function overlaps(a, b) {
	return !(a.startHour + a.duration <= b.startHour || b.startHour + b.duration <= a.startHour);
}
function sameDayStr(ev, dateStr) {
	return ev.dateStr === dateStr;
}
function dayEvents(events, dateStr) {
	return events.filter(e => sameDayStr(e, dateStr)).sort((a, b) => a.startHour - b.startHour);
}
function findFreeSlot(dateStr, duration, allEvents) {
	// thử 2 block: [start..lunch) và [resume..end)
	const blocks = [
		[WORK_HOURS.start, WORK_HOURS.lunch],
		[WORK_HOURS.resume, WORK_HOURS.end]
	];
	const dayE = dayEvents(allEvents, dateStr);

	for (const [bStart, bEnd] of blocks) {
		for (let h = bStart; h + duration <= bEnd; h++) {
			const candidate = { dateStr, startHour: h, duration };
			const conflict = dayE.some(ev => overlaps(ev, candidate));
			if (!conflict) return { startHour: h };
		}
	}
	return null; // ngày này không còn chỗ
}
function scheduleAcrossDates(subtasks, candidateDates, existingEvents) {
	const scheduled = [];
	const eventsOut = [];
	const all = existingEvents.slice();

	for (let i = 0; i < subtasks.length; i++) {
		const st = subtasks[i];
		let placed = false;

		for (let d = 0; d < candidateDates.length && !placed; d++) {
			const dateStr = toISODate(candidateDates[d]);
			const slot = findFreeSlot(dateStr, st.duration, all);
			if (slot) {
				const ev = {
					id: `ev-${Date.now()}-${i}-${Math.random().toString(36).slice(2,8)}`,
					title: `${st.phase ? `${st.phase} • ` : ""}${st.text}`,
					dateStr,
					startHour: slot.startHour,
					duration: st.duration
				};
				eventsOut.push(ev);
				all.push(ev);
				scheduled.push({ ...st, dateStr });
				placed = true;
			}
		}

		// nếu không đặt được trong khung, đẩy sang ngày làm việc tiếp theo sau cùng
		if (!placed) {
			const last = candidateDates.at(-1);
			let cur = addDays(last, 1);
			for (let guard = 0; guard < 60; guard++) {
				if (!isWeekday(cur)) { cur = addDays(cur, 1); continue; }
				const dateStr = toISODate(cur);
				const slot = findFreeSlot(dateStr, st.duration, all);
				if (slot) {
					const ev = {
						id: `ev-${Date.now()}-${i}-${Math.random().toString(36).slice(2,8)}`,
						title: `${st.phase ? `${st.phase} • ` : ""}${st.text}`,
						dateStr,
						startHour: slot.startHour,
						duration: st.duration
					};
					eventsOut.push(ev);
					all.push(ev);
					scheduled.push({ ...st, dateStr });
					break;
				}
				cur = addDays(cur, 1);
			}
		}
	}
	return { scheduledSubtasks: scheduled, events: eventsOut };
}

/* ---------- ICS (export) ---------- */
function pad2(n){ return String(n).padStart(2,'0'); }
function icsDateTimeLocal(d, hour=9) {
	const x = new Date(d.getFullYear(), d.getMonth(), d.getDate(), hour, 0, 0);
	const y = x.getFullYear() + pad2(x.getMonth()+1) + pad2(x.getDate()) + "T" + pad2(x.getHours()) + pad2(x.getMinutes()) + "00";
	return y;
}
function buildICS(events) {
	const now = new Date();
	const stamp = now.getFullYear() + pad2(now.getMonth()+1) + pad2(now.getDate()) + "T" + pad2(now.getHours()) + pad2(now.getMinutes()) + "00Z";
	let body = [
		"BEGIN:VCALENDAR",
		"VERSION:2.0",
		"PRODID:-//FlowAI//Tracker//VN"
	];
	for (const ev of events) {
		const d = new Date(ev.dateStr);
		const dtStart = icsDateTimeLocal(d, ev.startHour);
		const dtEnd = icsDateTimeLocal(d, ev.startHour + ev.duration);
		const uid = `${ev.id}@flowai.local`;
		body.push(
			"BEGIN:VEVENT",
			`UID:${uid}`,
			`DTSTAMP:${stamp}`,
			`DTSTART:${dtStart}`,
			`DTEND:${dtEnd}`,
			`SUMMARY:${ev.title.replace(/\n/g,' ')}`,
			"END:VEVENT"
		);
	}
	body.push("END:VCALENDAR");
	return body.join("\r\n");
}
function downloadText(filename, text) {
	const blob = new Blob([text], { type: "text/calendar;charset=utf-8" });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	a.remove();
	URL.revokeObjectURL(url);
}

/* ---------- server API (Planner) ---------- */
const API = import.meta?.env?.VITE_API_URL ?? ""; // ví dụ http://localhost:8000

async function apiPlanGoals({ title, desc, due, scope, locale }) {
  const r = await fetch(`${API}/api/ai/plan_goal`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, desc, due, scope, locale })
  });
  if (!r.ok) throw new Error(`plan_goal failed: ${r.status}`);
  const data = await r.json();
  return data.subtasks; // [{id,text,duration,dateStr?}]
}


async function apiSchedule({ tasks, start_date, work_hours="09:00-17:00", timezone="Asia/Ho_Chi_Minh" }) {
	const r = await fetch(`${API}/ai/schedule`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ tasks, start_date, work_hours, timezone })
	});
	if (!r.ok) throw new Error("schedule failed");
	const data = await r.json();
	return data.scheduled; // [{id,title,dateStr,start,end,duration}]
}

function ymd(d){ return new Date(d).toISOString().slice(0,10); }
function weekStartISO(d){ const x = new Date(d); return ymd((()=>{ const s=startOfWeek(x); return s; })()); }
function monthStartISO(d){ const x=new Date(d); x.setDate(1); return ymd(x); }

/* ---------- natural text parsing ---------- */
// …parseDuration, estimateDuration, smartSplit (giữ nếu muốn)

function smartSplitParagraph(title, desc) {
  const raw = `${desc || ""} ${title || ""}`.replace(/\r/g, " ").replace(/\s+/g, " ").trim();

  // tách theo dòng/bullet/ký hiệu câu
  let parts = raw
    .split(/(?:\n+|[•▪●]\s+|-\s+|\d+\.\s+|;|\.)(?!\d)/g)
    .map(s => s.trim())
    .filter(Boolean);

  // nếu vẫn ít, tách theo liên từ TV
  if (parts.length <= 1) {
    parts = raw
      .split(/\b(?:và|sau đó|tiếp theo|rồi|đồng thời|cuối cùng|kế tiếp)\b/gi)
      .map(s => s.trim())
      .filter(Boolean);
  }

  return Array.from(new Set(parts)).slice(0, 7);
}


/* ---------- main ---------- */
export default function Tracker() {
	/* calendar range */
	const [weekStart, setWeekStart] = useState(startOfWeek());
	const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

	/* goals + tasks + events (local) */
	const [activeTab, setActiveTab] = useState("daily"); // daily | weekly | monthly

	const [goals, setGoals] = useState(() => lsGet("goals", []));
	const [tasks, setTasks] = useState(() => lsGet("tasks", []));
	const [events, setEvents] = useState(() => lsGet("events", [])); // {id,title,dateStr, startHour, duration}
  const [planning, setPlanning] = useState(false);
  
	useEffect(() => { lsSet("goals", goals); }, [goals]);
	useEffect(() => { lsSet("tasks", tasks); }, [tasks]);
	useEffect(() => { lsSet("events", events); }, [events]);

	/* form state */
	const [title, setTitle] = useState("");
	const [desc, setDesc] = useState("");
	const [due, setDue] = useState(() => new Date().toISOString().slice(0,10)); // yyyy-mm-dd
	const [priority, setPriority] = useState("normal");

	const [gcConnected, setGcConnected] = useState(lsGet("gcConnected", false));
	useEffect(()=>lsSet("gcConnected", gcConnected), [gcConnected]);
  
  function deleteGoal(goal) {
    // Xoá goal
    setGoals(prev => prev.filter(g => g.id !== goal.id));
    // Xoá checklist con (id bắt đầu với `${goal.id}-`)
    setTasks(prev => prev.filter(t => !String(t.id).startsWith(`${goal.id}-`)));
    // Xoá events gắn với goal
    setEvents(prev => prev.filter(e => e.goalId !== goal.id));
  }



  async function onAIPlan() {
    setPlanning(true);
    try {
      const scope = activeTab;

      // 1) Lấy subtasks từ backend (AI) – có fallback paragraph
      let aiSubtasks;
      try {
        aiSubtasks = await apiPlanGoals({
          title: title.trim(),
          desc: desc.trim(),
          due,
          scope,
          locale: navigator.language || "vi-VN",
        }); // [{id,text,duration,dateStr?}]
      } catch (err) {
        console.warn("plan_goal failed → fallback local", err);
        const parts = smartSplitParagraph(title, desc); // helper đặt ở ngoài component
        aiSubtasks = parts.map((text, i) => ({
          id: i + 1,
          text,
          duration: Math.max(1, Math.round(estimateDuration(text))),
        }));
      }

      // 2) Chọn start_date theo scope
      const ymd = d => new Date(d).toISOString().slice(0,10);
      const start_date =
        scope === "weekly"  ? ymd(startOfWeek(new Date(due || Date.now()))) :
        scope === "monthly" ? (() => { const x = new Date(due || Date.now()); x.setDate(1); return ymd(x); })() :
                              (due || ymd(new Date()));

      // 3) Chuẩn hoá tasks cho scheduler (text → title)
      const toSchedule = aiSubtasks.map((t, i) => ({
        id: t.id ?? i + 1,
        title: t.title ?? t.text ?? `Task ${i + 1}`,
        duration: Math.max(1, Math.round(Number(t.duration) || 1)),
        dateStr: t.dateStr || undefined,
      }));

      // ADD: chuẩn hoá subtasks cho local scheduler (cần field text)
      const normalized = aiSubtasks.map((t, i) => ({
        id: t.id ?? i + 1,
        text: t.text ?? t.title ?? `Task ${i + 1}`,
        duration: Math.max(1, Math.round(Number(t.duration) || 1)),
        dateStr: t.dateStr || undefined,
      }));

      // ADD: chọn dải ngày theo scope để fallback local scheduling
      const dueDate = new Date(due || Date.now());
      let candidateDates = [];
      if (scope === "daily") {
        candidateDates = [dueDate];
      } else if (scope === "weekly") {
        const s = startOfWeek(dueDate);
        candidateDates = Array.from({ length: 7 }, (_, i) => addDays(s, i)).filter(isWeekday);
      } else { // monthly
        const mStart = startOfMonth(dueDate);
        let workDays = workingDaysBetween(mStart, dueDate);
        // nếu thiếu ngày, mở rộng sang sau due
        let cur = addDays(dueDate, 1);
        while (workDays.length < normalized.length) {
          if (isWeekday(cur)) workDays.push(new Date(cur));
          cur = addDays(cur, 1);
        }
        candidateDates = workDays;
      }

      // 4) Gọi scheduler – nếu lỗi thì vẫn tạo checklist từ aiSubtasks
      let scheduled = [];
      try {
        scheduled = await apiSchedule({
          tasks: toSchedule,
          start_date,
          work_hours: "09:00-17:00",
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Ho_Chi_Minh",
        }); // [{id,title,dateStr,start,end,duration}]
      } catch (e) {
        console.warn("schedule failed → dùng checklist không lịch", e);
      }

      // 5) Dựng plan
      let plan;
      if (scheduled.length) {
        const eventsPlan = scheduled.map((ev, i) => {
          const [hh] = (ev.start || "09:00").split(":").map(Number);
          const dur = Math.max(1, Math.round(ev.duration || 1));
          return {
            id: `ev-${Date.now()}-${i}`,
            title: `${title || "Goal"} — ${ev.title}`,
            dateStr: ev.dateStr,
            startHour: hh,
            duration: dur,
          };
        });
        plan = {
          subtasks: scheduled.map(ev => ({
            id: ev.id ?? `${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
            text: ev.title,
            duration: Math.max(1, Math.round(ev.duration || 1)),
            dateStr: ev.dateStr,
          })),
          events: eventsPlan,
        };
      } else {
        // REPLACE: Fallback local scheduling để luôn có events
        const { scheduledSubtasks, events: eventsPlan } =
          scheduleAcrossDates(normalized, candidateDates, events);

        plan = {
          subtasks: scheduledSubtasks.map(s => ({
            id: s.id,
            text: s.text,
            duration: s.duration,
            dateStr: s.dateStr,
          })),
          events: eventsPlan,
        };
      }

      addGoal(plan); // <-- giờ chắc chắn có subtasks
      // ADD: nhảy lịch tới tuần chứa event sớm nhất để nhìn thấy ngay
      if (plan.events?.length) {
        const firstISO = plan.events.map(e => e.dateStr).sort()[0];
        if (firstISO) setWeekStart(startOfWeek(new Date(firstISO)));
      }
    } catch (e) {
      console.error(e);
      alert("AI planning failed. Kiểm tra backend & API key.");
    } finally {
      setPlanning(false);
    }
  }



	/* add goal */
	function addGoal(plan = null) {
		if (!title.trim()) return;
		const g = {
			id: Date.now(),
			scope: activeTab,    // daily/weekly/monthly
			title: title.trim(),
			desc: desc.trim(),
			due,
			priority,
			subtasks: plan?.subtasks ?? [],
			planned: !!plan
		};
		setGoals(prev => [g, ...prev]);

		// push subtasks -> tasks
		if (plan?.subtasks?.length) {
			const toAdd = plan.subtasks.map((t) => ({
				id: `${g.id}-${t.id}`,
				text: t.text,
				done: false,
				due: t.dateStr ?? due,
				estimate: t.duration ?? 1
			}));
			setTasks(prev => [...toAdd, ...prev]);
		}
		// add scheduled events
		if (plan?.events?.length) {
      const tagged = plan.events.map(ev => ({ ...ev, goalId: g.id }));
      setEvents(prev => [...tagged, ...prev]);
    }
		setTitle(""); setDesc("");
	}

	/* checklist operations */
	function toggleTask(id) { setTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t)); }
	function removeTask(id) { setTasks(prev => prev.filter(t => t.id !== id)); }

	/* ---------- AI planner (smarter) ----------
		- Tách desc thành 3–7 subtasks (nhận dạng "2h", "90m"...).
		- Ước lượng duration nếu thiếu, quy ước bội số 0.5h (làm tròn lên 1h khi xếp lịch).
		- Phân bổ theo scope:
			• daily: cùng ngày (due)
			• weekly: tuần chứa due (Mon–Fri)
			• monthly: từ đầu tháng đến due (Mon–Fri), nếu thiếu thì lùi/tiến cho đủ
		- Xếp lịch vào slot rảnh, tránh giờ trưa.
	*/
	function aiPlan() {
		const dueDate = new Date(due || new Date());
		const parts = smartSplit(title, desc);

		// subtasks + phase (roadmap thô: Discover -> Build -> Wrap)
		const phases = ["Discover", "Build", "Wrap"];
		const chunked = parts.map((text, i) => {
			const d = parseDuration(text) ?? estimateDuration(text);
			const duration = Math.max(1, Math.round(d)); // dùng đơn vị giờ, >=1h
			const phase = phases[Math.min(2, Math.floor(i / Math.ceil(parts.length / 3)))];
			return { id: i + 1, text, duration, phase };
		});

		// chọn dải ngày ứng với scope
		let candidateDates = [];
		if (activeTab === "daily") {
			candidateDates = [dueDate];
		} else if (activeTab === "weekly") {
			const start = startOfWeek(dueDate);
			candidateDates = Array.from({ length: 7 }, (_, i) => addDays(start, i)).filter(isWeekday);
		} else {
			// monthly
			const mStart = startOfMonth(dueDate);
			let workDays = workingDaysBetween(mStart, dueDate);
			if (workDays.length < chunked.length) {
				// nếu thiếu ngày, mở rộng tới sau due
				let cur = addDays(dueDate, 1);
				while (workDays.length < chunked.length) {
					if (isWeekday(cur)) workDays.push(new Date(cur));
					cur = addDays(cur, 1);
				}
			}
			candidateDates = workDays;
		}

		// lập lịch tránh trùng với các events hiện có
		const { scheduledSubtasks, events: eventsPlan } = scheduleAcrossDates(chunked, candidateDates, events);

		// đóng gói
		return {
			subtasks: scheduledSubtasks.map(s => ({
				id: s.id,
				text: s.text,
				duration: s.duration,
				dateStr: s.dateStr
			})),
			events: eventsPlan
		};
	}

	/* events cho tuần hiện tại */
	const weekEvents = useMemo(() => {
		return events.filter(e => days.some(d => e.dateStr && sameDay(new Date(e.dateStr), d)));
	}, [events, days]);

	function exportWeekICS() {
		if (!weekEvents.length) return;
		const ics = buildICS(weekEvents);
		const label = `${toISODate(days[0])}_to_${toISODate(days.at(-1))}.ics`;
		downloadText(`FlowAI-${label}`, ics);
	}

	return (
		<div className="min-h-screen flex flex-col bg-gradient-to-b from-green-100 to-green-300 text-slate-800">
			{/* NAV (giữ như trang Note) */}
			<header className="max-w-6xl mx-auto w-full px-5 py-4 flex items-center justify-between">
				<div className="flex items-center gap-3">
					<img src="/vite.svg" alt="FlowAI" className="h-8 w-8 rounded" />
					<span className="font-semibold text-slate-600">FlowAI</span>
				</div>
				<nav className="flex items-center gap-6">
					<Link to="/" className="text-slate-500 hover:text-slate-700">Home</Link>
					<Link to="/note" className="text-slate-500 hover:text-slate-700">AI Note Assistant</Link>
				</nav>
			</header>

			<main className="max-w-6xl mx-auto px-5 pb-12 space-y-6">
				{/* Connect Google Calendar (placeholder) */}
				<div className="rounded-2xl bg-white/80 p-5 ring-1 ring-black/5 shadow flex items-center justify-between">
					<div>
						<h2 className="text-lg font-semibold text-emerald-900">Calendar</h2>
						<p className="text-sm text-slate-600">
							{gcConnected ? "Connected to Google Calendar" : "Sync with Google Calendar to push schedules & reminders"}
						</p>
					</div>
					<button
						onClick={() => setGcConnected(v => !v)}
						className={`rounded-lg px-4 py-2 ${gcConnected ? 'bg-red-600' : 'bg-emerald-600'} text-white hover:opacity-90`}
					>
						{gcConnected ? "Disconnect" : "Connect"}
					</button>
				</div>

				{/* Goals + AI planner */}
				<section className="rounded-2xl bg-white/80 p-6 ring-1 ring-black/5 shadow">
					<div className="flex items-center justify-between gap-3 flex-wrap">
						<h2 className="text-xl font-semibold text-emerald-900">Goals</h2>
						<div className="inline-flex gap-2">
							{["daily","weekly","monthly"].map(k => (
								<button
									key={k}
									onClick={()=>setActiveTab(k)}
									className={`px-3 py-1.5 rounded-lg ring-1 ring-black/10 ${activeTab===k?'bg-emerald-600 text-white':'bg-white hover:bg-slate-50'}`}
								>
									{k[0].toUpperCase()+k.slice(1)}
								</button>
							))}
						</div>
					</div>

					<div className="mt-4 grid md:grid-cols-2 gap-4">
						<div>
							<label className="block text-sm font-medium text-slate-600">Title</label>
							<input
								value={title}
								onChange={e=>setTitle(e.target.value)}
								placeholder="VD: Hoàn thành bản đề xuất…"
								className="mt-2 w-full rounded-lg border border-slate-200 p-3 focus:outline-none focus:ring-2 focus:ring-emerald-400"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-slate-600">Due date</label>
							<input
								type="date"
								value={due}
								onChange={e=>setDue(e.target.value)}
								className="mt-2 w-full rounded-lg border border-slate-200 p-3 focus:outline-none focus:ring-2 focus:ring-emerald-400"
							/>
						</div>
					</div>

					<div className="mt-3">
						<label className="block text-sm font-medium text-slate-600">Description</label>
						<textarea
							value={desc}
							onChange={e=>setDesc(e.target.value)}
							placeholder="Mô tả, yêu cầu… (AI sẽ dựa vào đây để chia task; có thể ghi 'Nghiên cứu 2h; Code 3h; Viết báo cáo 1.5h')"
							className="mt-2 h-28 w-full rounded-lg border border-slate-200 p-3 focus:outline-none focus:ring-2 focus:ring-emerald-400"
						/>
					</div>

					<div className="mt-3 flex gap-3 items-center">
						<label className="text-sm font-medium text-slate-600">Priority</label>
						<select
							value={priority}
							onChange={e=>setPriority(e.target.value)}
							className="rounded-lg border border-slate-200 p-2 focus:ring-2 focus:ring-emerald-400"
						>
							<option value="low">Low</option>
							<option value="normal">Normal</option>
							<option value="high">High</option>
						</select>

						<div className="ml-auto flex gap-2">
							<button
                onClick={()=>addGoal(null)}
                disabled={planning}
                className="rounded-lg bg-white px-4 py-2 ring-1 ring-black/10 hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Save goal
              </button>

              <button
                onClick={onAIPlan}
                disabled={planning || !title.trim()}
                className={`rounded-lg text-white px-4 py-2 ${planning ? "bg-emerald-400 cursor-wait" : "bg-emerald-600 hover:bg-emerald-700"}`}
              >
                {planning ? (
                  <span className="inline-flex items-center gap-2">
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" aria-hidden="true">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.25" />
                      <path d="M22 12a10 10 0 0 1-10 10" fill="currentColor" />
                    </svg>
                    Planning…
                  </span>
                ) : "AI Plan & Schedule"}
              </button>
						</div>
					</div>

					{/* goals list */}
					<div className="mt-5 grid md:grid-cols-2 gap-4">
						{goals.filter(g=>g.scope===activeTab).map(g=>(
							<article key={g.id} className="rounded-xl border border-slate-200 bg-white p-4">
								<div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold">{g.title}</h3>
                    <p className="text-sm text-slate-600 whitespace-pre-wrap">{g.desc}</p>
                    <div className="mt-1 text-xs text-slate-500">Due: {g.due} • Priority: {g.priority}</div>
                  </div>

                  <button
                    onClick={() => deleteGoal(g)}
                    title="Delete goal"
                    className="p-2 text-slate-400 hover:text-red-600"
                  >
                    <i className="fa-solid fa-trash" />
                  </button>
                </div>

								{g.subtasks?.length ? (
                  <ul className="mt-3 pl-1 text-sm space-y-2">
                    {g.subtasks.map(s => {
                      const tid = `${g.id}-${s.id}`;
                      const t = tasks.find(x => x.id === tid);
                      const checked = !!t?.done;
                      return (
                        <li key={s.id} className="flex items-center gap-3">
                          <input type="checkbox" className="h-4 w-4" checked={checked} onChange={()=>toggleTask(tid)} />
                          <span className={checked ? "line-through text-slate-400" : ""}>
                            {s.text}{s.dateStr ? <span className="ml-2 text-xs text-slate-500">({s.dateStr}, ~{s.duration}h)</span> : null}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
							</article>
						))}
						{!goals.filter(g=>g.scope===activeTab).length && (
							<div className="text-sm text-slate-500">Chưa có goal nào.</div>
						)}
					</div>
				</section>

				{/* Checklist + Weekly Calendar */}
				<div className="grid lg:grid-cols-3 gap-6">
					{/* Checklist */}
					<section className="rounded-2xl bg-white/80 p-6 ring-1 ring-black/5 shadow lg:col-span-1">
						<h2 className="text-xl font-semibold text-emerald-900">Checklist</h2>
						<ul className="mt-3 space-y-2">
							{tasks.map(t=>(
								<li key={t.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-2">
									<label className="flex items-center gap-3">
										<input type="checkbox" checked={t.done} onChange={()=>toggleTask(t.id)} className="h-4 w-4"/>
										<span className={t.done?'line-through text-slate-400':''}>{t.text}</span>
									</label>
									<div className="flex items-center gap-3">
										<span className="text-xs text-slate-500">{t.due}</span>
										<button onClick={()=>removeTask(t.id)} className="p-2 text-slate-400 hover:text-red-600">
											<i className="fa-solid fa-trash"/>
										</button>
									</div>
								</li>
							))}
							{!tasks.length && <li className="text-sm text-slate-500">Chưa có task nào.</li>}
						</ul>
					</section>

					{/* Calendar (weekly) */}
					<section className="rounded-2xl bg-white/80 p-6 ring-1 ring-black/5 shadow lg:col-span-2">
						<div className="flex items-center justify-between">
							<h2 className="text-xl font-semibold text-emerald-900">Weekly Calendar</h2>
							<div className="flex items-center gap-2">
								<button onClick={()=>setWeekStart(addDays(weekStart,-7))} className="rounded-lg bg-white px-3 py-1.5 ring-1 ring-black/10 hover:bg-slate-50">
									‹ Prev
								</button>
								<button onClick={()=>setWeekStart(startOfWeek())} className="rounded-lg bg-white px-3 py-1.5 ring-1 ring-black/10 hover:bg-slate-50">
									Today
								</button>
								<button onClick={()=>setWeekStart(addDays(weekStart,7))} className="rounded-lg bg-white px-3 py-1.5 ring-1 ring-black/10 hover:bg-slate-50">
									Next ›
								</button>
								<button onClick={exportWeekICS} className="rounded-lg bg-emerald-600 text-white px-3 py-1.5 hover:bg-emerald-700">
									Export .ics
								</button>
							</div>
						</div>

						{/* header days */}
						<div className="mt-4 grid grid-cols-8 text-sm text-slate-600">
							<div></div>
							{days.map(d=> <div key={d.toISOString()} className="text-center font-medium">{fmtDate(d)}</div>)}
						</div>

						{/* grid */}
						<div className="relative mt-1 border border-slate-200 rounded-lg overflow-hidden">
							{HOURS.map((h,ri)=>(
								<div key={h} className="grid grid-cols-8">
									<div className="h-14 px-2 text-xs text-slate-500 flex items-start pt-2">{`${String(h).padStart(2,'0')}:00`}</div>
									{days.map((d,ci)=>(
										<div key={ci} className={`h-14 border-t ${ri===0?'border-slate-200':'border-slate-100'} border-l last:border-r-0`} />
									))}
								</div>
							))}

							{/* events blocks */}
							<div className="absolute inset-0 pointer-events-none">
								{weekEvents.map(ev=>{
									const dayIndex = days.findIndex(d => sameDay(new Date(ev.dateStr), d));
									if (dayIndex === -1) return null;
									const top = (ev.startHour - 8) * 56 + 4; // 56px per hour approx
									const height = ev.duration * 56 - 8;
									const left = (dayIndex + 1) * (100/8); // skip col-0 (hours)
									const width = 100/8;
									return (
										<div
											key={ev.id}
											className="absolute bg-emerald-500/80 text-white text-[11px] rounded p-1 overflow-hidden"
											style={{ top, left: `${left}%`, width: `${width}%`, height }}
											title={ev.title}
										>
											{ev.title}
										</div>
									);
								})}
							</div>
						</div>
					</section>
				</div>
			</main>
		</div>
	);
}
