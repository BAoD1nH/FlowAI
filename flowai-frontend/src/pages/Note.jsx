import { Link } from "react-router-dom";
import { useState, useEffect } from "react";

export default function Note() {

    const [noteBody, setNoteBody] = useState("");
    const [notes, setNotes] = useState(() => {
        try { return JSON.parse(localStorage.getItem("notes") || "[]"); } catch { return []; }
    });
    useEffect(() => localStorage.setItem("notes", JSON.stringify(notes)), [notes]);

    function handleSaveNote() {
        const body = noteBody.trim();
        if (!body) return;
        setNotes(prev => [{ id: Date.now(), body, createdAt: new Date().toISOString() }, ...prev]);
        setNoteBody("");
    }
    function deleteNote(id) {
        setNotes(prev => prev.filter(n => n.id !== id));
    }


    const [taskInput, setTaskInput] = useState("");
    const [tasks, setTasks] = useState([]);

    function addTask() {
        const t = taskInput.trim();
        if (!t) return;
        setTasks(prev => [...prev, { id: Date.now(), text: t, done: false }]);
        setTaskInput("");
    }
    function toggleTask(id) {
        setTasks(prev => prev.map(x => x.id === id ? { ...x, done: !x.done } : x));
    }
    function removeTask(id) {
        setTasks(prev => prev.filter(x => x.id !== id));
    }
    function clearCompleted() {
        setTasks(prev => prev.filter(x => !x.done));
    }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-green-100 to-green-300 text-slate-800">
      {/* Nav */}
      <header className="max-w-6xl mx-auto w-full px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/vite.svg" alt="FlowAI" className="h-8 w-8 rounded" />
          <span className="font-semibold text-slate-600">FlowAI</span>
        </div>
        <nav className="flex items-center gap-6">
          <Link to="/" className="text-slate-500 hover:text-slate-700">Home</Link>
          <Link to="/tracker" className="text-slate-500 hover:text-slate-700">Productivity Tracker</Link>
        </nav>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-5 py-8 grid md:grid-cols-2 gap-6">
        {/* Upload */}
        <div className="rounded-2xl bg-white/80 p-6 ring-1 ring-black/5 shadow">
          <h1 className="text-2xl font-bold text-emerald-900">AI Note Assistant</h1>
          <label className="block mt-4 text-sm font-medium text-slate-600">Upload files / images</label>
          <input
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.txt,.md,.png,.jpg,.jpeg,.webp"
            className="mt-3 block w-full text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-emerald-600 file:px-4 file:py-2 file:text-white hover:file:bg-emerald-700"
          />
          <p className="mt-2 text-xs text-slate-500">Hỗ trợ PDF, DOCX, TXT, PNG/JPG/WebP…</p>
        </div>

        {/* Prompt */}
        <div className="rounded-2xl bg-white/80 p-6 ring-1 ring-black/5 shadow">
          <label className="block text-sm font-medium text-slate-600">Prompt</label>
          <textarea
            placeholder="Ví dụ: Tóm tắt, highlight 3 ý chính và sinh checklist…"
            className="mt-3 h-48 w-full rounded-lg border border-slate-200 p-3 focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
          <div className="mt-4 flex gap-3">
            <button className="rounded-lg bg-emerald-600 text-white px-4 py-2 hover:bg-emerald-700">Run</button>
            <button className="rounded-lg bg-white px-4 py-2 ring-1 ring-black/10 hover:bg-slate-50">Clear</button>
          </div>
        </div>

        {/* NOTES – recent row */}
        <section className="rounded-2xl bg-white/80 p-5 ring-1 ring-black/5 shadow md:col-span-2">
            <div className="flex items-center justify-between">
                <h2 className="font-semibold text-slate-700">NOTES</h2>
                <div className="text-sm text-slate-500">Recent</div>
            </div>

            <div className="mt-4 flex gap-4 overflow-x-auto snap-x pb-1">
                {notes.length ? (
                notes.map(n => (
                    <article
                    key={n.id}
                    className="min-w-[260px] snap-start rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
                    >
                    <div className="line-clamp-4 whitespace-pre-wrap text-sm text-slate-800">
                        {n.body}
                    </div>
                    <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
                        <span>{new Date(n.createdAt).toLocaleString()}</span>
                        <button
                        onClick={() => deleteNote(n.id)}
                        className="text-slate-400 hover:text-red-600"
                        title="Delete"
                        >
                        <i className="fa-solid fa-trash" />
                        </button>
                    </div>
                    </article>
                ))
                ) : (
                <div className="text-sm text-slate-500">Chưa có ghi chú nào.</div>
                )}
            </div>
        </section>


        {/* New note (Scratch pad) + My Tasks */}
        <section className="md:col-span-2 grid md:grid-cols-2 gap-6">
        {/* SCRATCH PAD (New note) */}
        <div className="rounded-2xl bg-[#FFF7CC] p-5 ring-1 ring-black/10 shadow">
            <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-800">SCRATCH PAD</h3>
            </div>
            <textarea
            value={noteBody}
            onChange={e => setNoteBody(e.target.value)}
            placeholder="New note…"
            className="mt-3 h-40 w-full rounded-lg border border-yellow-200 bg-white/60 p-3
                        focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
            <div className="mt-3 flex gap-2">
            <button
                onClick={handleSaveNote}
                className="rounded-lg bg-emerald-600 text-white px-4 py-2 hover:bg-emerald-700"
            >
                Save
            </button>
            <button
                onClick={() => setNoteBody("")}
                className="rounded-lg bg-white px-4 py-2 ring-1 ring-black/10 hover:bg-slate-50"
            >
                Clear
            </button>
            </div>
        </div>

        {/* MY TASKS */}
        <div className="rounded-2xl bg-white/80 p-5 ring-1 ring-black/5 shadow">
            <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-800">MY TASKS</h3>
            {tasks.some(t => t.done) && (
                <button onClick={clearCompleted} className="text-xs text-slate-500 hover:text-slate-700">
                Clear done
                </button>
            )}
            </div>

            <div className="mt-3 flex gap-2">
            <input
                type="text"
                value={taskInput}
                onChange={e => setTaskInput(e.target.value)}
                placeholder="Thêm task…"
                className="flex-1 rounded-lg border border-slate-200 p-2.5
                        focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
            <button
                onClick={addTask}
                className="rounded-lg bg-emerald-600 text-white px-3 py-2 hover:bg-emerald-700"
            >
                Add
            </button>
            </div>

            <ul className="mt-3 space-y-2">
            {tasks.map(t => (
                <li
                key={t.id}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-2"
                >
                <label className="flex items-center gap-3">
                    <input
                    type="checkbox"
                    checked={t.done}
                    onChange={() => toggleTask(t.id)}
                    className="h-4 w-4"
                    />
                    <span className={t.done ? "line-through text-slate-400" : ""}>{t.text}</span>
                </label>
                <button
                    onClick={() => removeTask(t.id)}
                    className="p-2 text-slate-400 hover:text-red-600"
                    aria-label="Delete task"
                >
                    <i className="fa-solid fa-trash" />
                </button>
                </li>
            ))}
            {!tasks.length && <li className="text-sm text-slate-500">Chưa có task nào.</li>}
            </ul>
        </div>
        </section>


      </main>
    </div>
  );
}
