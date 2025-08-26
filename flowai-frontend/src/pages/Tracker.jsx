// src/pages/Tracker.jsx
import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";

/* ---------- helpers ---------- */
const lsGet = (k, v) => {
  try { return JSON.parse(localStorage.getItem(k) ?? JSON.stringify(v)); } catch { return v; }
};
const lsSet = (k, v) => localStorage.setItem(k, JSON.stringify(v));

const HOURS = Array.from({ length: 11 }, (_, i) => 8 + i); // 8h -> 18h

function startOfWeek(d = new Date()) {
  const x = new Date(d);
  const day = x.getDay(); // 0..6 (Sun..Sat)
  const diff = (day === 0 ? -6 : 1) - day; // about Monday start
  x.setDate(x.getDate() + diff);
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
      planned: !!plan,
    };
    setGoals(prev => [g, ...prev]);
    // also push subtasks to tasks list if planned
    if (plan?.subtasks?.length) {
      const toAdd = plan.subtasks.map((t) => ({
        id: `${g.id}-${t.id}`,
        text: t.text,
        done: false,
        due: t.dateStr ?? due,
        estimate: t.duration ?? 1,
      }));
      setTasks(prev => [...toAdd, ...prev]);
    }
    // add scheduled events
    if (plan?.events?.length) {
      setEvents(prev => [...plan.events, ...prev]);
    }
    setTitle(""); setDesc("");
  }

  /* checklist operations */
  function toggleTask(id) { setTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t)); }
  function removeTask(id) { setTasks(prev => prev.filter(t => t.id !== id)); }

  /* ---------- AI planner (demo) ----------
    - tách desc thành 3–5 subtasks
    - xếp lịch vào lịch tuần hiện tại từ 9h, mỗi task 1h
    - thực tế: gọi API của bạn; ở đây chỉ mô phỏng UI/logic
  */
  function aiPlan() {
    const baseDate = new Date(due || new Date());
    const sentences = (desc || title)
      .split(/[\n\.]/).map(s => s.trim()).filter(Boolean);
    const chunks = (sentences.length ? sentences : [
      `Phân tích yêu cầu cho “${title || 'Mục tiêu'}”`,
      "Thực hiện phần chính",
      "Tổng hợp & viết báo cáo",
    ]).slice(0, 5);

    const subtasks = chunks.map((text, i) => ({ id: i + 1, text, duration: 1 }));

    // schedule sequentially in week view starting from 9am of due week
    const start = startOfWeek(baseDate);
    let dayIdx = 0, hour = 9;
    const eventsPlan = [];

    for (let i = 0; i < subtasks.length; i++) {
      const date = addDays(start, dayIdx);
      const dateStr = date.toISOString().slice(0, 10);
      eventsPlan.push({
        id: `ev-${Date.now()}-${i}`,
        title: `${title || 'Goal'} — ${subtasks[i].text}`,
        dateStr,
        startHour: hour,
        duration: subtasks[i].duration,
      });
      // next slot
      hour += 1;
      if (hour > 16) { hour = 9; dayIdx += 1; }
    }

    return { subtasks, events: eventsPlan };
  }

  /* apply AI plan */
  function onAIPlan() {
    const plan = aiPlan();
    addGoal(plan);
  }

  /* events for current week */
  const weekEvents = useMemo(() => {
    return events.filter(e => days.some(d => e.dateStr && sameDay(new Date(e.dateStr), d)));
  }, [events, days]);

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
              placeholder="Mô tả, yêu cầu… (AI sẽ dựa vào đây để chia task)"
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
              <button onClick={()=>addGoal(null)} className="rounded-lg bg-white px-4 py-2 ring-1 ring-black/10 hover:bg-slate-50">
                Save goal
              </button>
              <button onClick={onAIPlan} className="rounded-lg bg-emerald-600 text-white px-4 py-2 hover:bg-emerald-700">
                AI Plan & Schedule
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
                </div>
                {g.subtasks?.length ? (
                  <ul className="mt-3 list-disc pl-4 text-sm space-y-1">
                    {g.subtasks.map(s=> <li key={s.id}>{s.text}</li>)}
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
