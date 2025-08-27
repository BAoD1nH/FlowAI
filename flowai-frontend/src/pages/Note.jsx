import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function Note() {
	// ===== Notes (local) =====
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

	// ===== Tasks (local) =====
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

	// ===== AI Integration =====
	const API = import.meta.env.VITE_API_URL ?? "http://localhost:8000"; // đổi sang proxy /api nếu bạn dùng Vite proxy
	const [prompt, setPrompt] = useState("");
	const [files, setFiles] = useState([]);
	const [isRunning, setIsRunning] = useState(false);
	const [summary, setSummary] = useState("");
	const [todos, setTodos] = useState([]);
    const [autoSave, setAutoSave] = useState(true);

	function onPickFiles(e) {
		const list = Array.from(e.target.files || []);
		setFiles(list);
	}

	async function runAI() {
        if (!noteBody.trim() && files.length === 0 && !prompt.trim()) return;
        setIsRunning(true);
        setSummary("");

        let outputs = [];

        // 0) Prompt-only (không file, không note) -> vẫn chạy
        if (prompt.trim() && !noteBody.trim() && files.length === 0) {
            const fd = new FormData();
            fd.append("text", prompt.trim());
            fd.append("style", "bullet");
            const res = await fetch(`${API}/summarize/text`, { method: "POST", body: fd });
            const data = await res.json();
            const out = data.summary || JSON.stringify(data);
            outputs.push(`### PROMPT\n${out}`);
            // Auto-save ngay nếu bật
            if (autoSave && out.trim()) {
                setNotes(prev => [{ id: Date.now(), body: out.trim(), createdAt: new Date().toISOString() }, ...prev]);
            }
            setSummary(outputs.join("\n\n"));
            setIsRunning(false);
            return;
        }

        // 1) Xử lý file (nếu có)
        for (const f of files) {
            try {
                const name = f.name || "file";
                const lower = name.toLowerCase();
                if (lower.endsWith(".pdf")) {
                    const fd = new FormData();
                    fd.append("file", f);
                    fd.append("style", "bullet");
                    const res = await fetch(`${API}/summarize/pdf`, { method: "POST", body: fd });
                    const data = await res.json();
                    outputs.push(`### ${name}\n${data.summary || JSON.stringify(data)}`);
                } else if (/\.(png|jpg|jpeg|webp)$/i.test(lower)) {
                    const fd = new FormData();
                    fd.append("file", f);
                    fd.append("style", "bullet");
                    const res = await fetch(`${API}/summarize/image`, { method: "POST", body: fd });
                    const data = await res.json();
                    outputs.push(`### ${name}\n${data.summary || JSON.stringify(data)}`);
                } else if (/\.(txt|md)$/i.test(lower)) {
                    const text = await f.text();
                    const fd = new FormData();
                    const textForLLM = prompt.trim()
                        ? `${prompt.trim()}\n\n---\nCONTENT:\n${text}`
                        : text;
                    fd.append("text", textForLLM);
                    fd.append("style", "bullet");
                    const res = await fetch(`${API}/summarize/text`, { method: "POST", body: fd });
                    const data = await res.json();
                    outputs.push(`### ${name}\n${data.summary || JSON.stringify(data)}`);
                } else {
                    outputs.push(`### ${name}\n(Định dạng chưa hỗ trợ trực tiếp. Hãy lưu thành PDF/TXT hoặc dán vào SCRATCH PAD.)`);
                }
            } catch (e) {
                outputs.push(`(Lỗi khi xử lý ${f.name}: ${String(e)})`);
            }
        }

        // 2) Xử lý SCRATCH PAD (nếu có)
        if (noteBody.trim()) {
            const fd = new FormData();
            const textForLLM = prompt.trim()
                ? `${prompt.trim()}\n\n---\nCONTENT:\n${noteBody}`
                : noteBody;
            fd.append("text", textForLLM);
            fd.append("style", "bullet");

            let ok = false;
            try {
                const res = await fetch(`${API}/ai/summarize-note`, { method: "POST", body: fd });
                if (res.ok) {
                    const data = await res.json();
                    outputs.push(`### SCRATCH PAD\n${data.summary || JSON.stringify(data)}`);
                    ok = true;
                }
            } catch {}
            if (!ok) {
                const fd2 = new FormData();
                fd2.append("text", textForLLM);
                fd2.append("style", "bullet");
                const res2 = await fetch(`${API}/summarize/text`, { method: "POST", body: fd2 });
                const data2 = await res2.json();
                outputs.push(`### SCRATCH PAD\n${data2.summary || JSON.stringify(data2)}`);
            }
        }

        // 3) Set summary + Auto-save note gộp
        const finalOut = outputs.join("\n\n");
        setSummary(finalOut);
        if (autoSave && finalOut.trim()) {
            setNotes(prev => [{ id: Date.now(), body: finalOut.trim(), createdAt: new Date().toISOString() }, ...prev]);
        }
        setIsRunning(false);
    }


	async function runExtractTodos() {
		// Rút trích checklist từ noteBody (fallback dùng /summarize/text để buộc bullet)
		if (!noteBody.trim()) return;
		const fd = new FormData();
		fd.append("text", `From the following note, extract a concise checklist of actionable items. Use bullet points only.\n\nNOTE:\n${noteBody}`);
		fd.append("style", "bullet");
		const res = await fetch(`${API}/summarize/text`, { method: "POST", body: fd });
		const data = await res.json();
		const text = (data.summary || "").split("\n").map(s => s.trim()).filter(Boolean);
		setTodos(text.length ? text : [data.summary || JSON.stringify(data)]);
	}

	function clearAllAI() {
		setSummary("");
		setTodos([]);
		setFiles([]);
		setPrompt("");
	}

	function saveSummaryAsNote() {
		const body = summary.trim();
		if (!body) return;
		setNotes(prev => [{ id: Date.now(), body, createdAt: new Date().toISOString() }, ...prev]);
		setSummary("");
	}

    // Modal xem note đầy đủ
    const [viewerOpen, setViewerOpen] = useState(false);
    const [activeNote, setActiveNote] = useState(null);

    function openNote(n) {
        setActiveNote(n);
        setViewerOpen(true);
    }
    function closeViewer() {
        setViewerOpen(false);
        setActiveNote(null);
    }

    // Đóng bằng phím ESC + khoá scroll nền khi mở
    useEffect(() => {
        function onKey(e){ if (e.key === "Escape") closeViewer(); }
        if (viewerOpen) {
            window.addEventListener("keydown", onKey);
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => {
            window.removeEventListener("keydown", onKey);
            document.body.style.overflow = "";
        };
    }, [viewerOpen]);


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
						onChange={onPickFiles}
						accept=".pdf,.txt,.md,.png,.jpg,.jpeg,.webp"
						className="mt-3 block w-full text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-emerald-600 file:px-4 file:py-2 file:text-white hover:file:bg-emerald-700"
					/>
					<p className="mt-2 text-xs text-slate-500">
						Hỗ trợ PDF, TXT/MD, PNG/JPG/WebP. DOC/DOCX chưa xử lý trực tiếp — hãy lưu thành PDF/TXT.
					</p>

					{/* Kết quả AI */}
					{summary && (
                        <div className="mt-5 rounded-xl bg-white/80 p-4 border border-slate-200">
                            <div className="flex items-center justify-between">
                                <h3 className="font-semibold text-slate-800">AI Summary</h3>
                                <button onClick={saveSummaryAsNote} className="text-xs text-emerald-700 hover:underline">
                                    Save as note
                                </button>
                            </div>

                            <div className="mt-2 text-sm leading-6">
                                <ReactMarkdown
                                    remarkPlugins={[remarkGfm]}
                                    components={{
                                        h1: (props) => <h1 className="text-xl font-bold mt-3 mb-1" {...props} />,
                                        h2: (props) => <h2 className="text-lg font-semibold mt-3 mb-1" {...props} />,
                                        h3: (props) => <h3 className="text-base font-semibold mt-3 mb-1" {...props} />,
                                        p:  (props) => <p className="my-2" {...props} />,
                                        ul: (props) => <ul className="list-disc pl-5 my-2" {...props} />,
                                        ol: (props) => <ol className="list-decimal pl-5 my-2" {...props} />,
                                        li: (props) => <li className="my-1" {...props} />,
                                        code({inline, children, ...props}) {
                                            return inline ? (
                                                <code className="px-1 py-0.5 rounded bg-slate-100" {...props}>{children}</code>
                                            ) : (
                                                <pre className="p-3 rounded bg-slate-900 text-slate-100 overflow-auto text-sm">
                                                    <code {...props}>{children}</code>
                                                </pre>
                                            );
                                        }
                                    }}
                                >
                                    {summary}
                                </ReactMarkdown>
                            </div>
                        </div>
                    )}


					{todos.length > 0 && (
						<div className="mt-4 rounded-xl bg-white/80 p-4 border border-slate-200">
							<h3 className="font-semibold text-slate-800">Checklist</h3>
							<ul className="mt-2 list-disc pl-5 text-sm">
								{todos.map((t, i) => <li key={i}>{t.replace(/^[-•]\s*/,"")}</li>)}
							</ul>
						</div>
					)}
				</div>

				{/* Prompt */}
                <div className="rounded-2xl bg-white/80 p-6 ring-1 ring-black/5 shadow">
                    <label className="block text-sm font-medium text-slate-600">Prompt</label>
                    <textarea
                        value={prompt}
                        onChange={e => setPrompt(e.target.value)}
                        placeholder="Ví dụ: Tóm tắt, highlight 3 ý chính và sinh checklist…"
                        className="mt-3 h-48 w-full rounded-lg border border-slate-200 p-3 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    />
                    <div className="mt-4 flex items-center gap-3">
                        <button
                            onClick={runAI}
                            disabled={isRunning}
                            className="rounded-lg bg-emerald-600 text-white px-4 py-2 hover:bg-emerald-700 disabled:opacity-60"
                        >
                            {isRunning ? "Running..." : "Run"}
                        </button>
                        <button
                            onClick={clearAllAI}
                            className="rounded-lg bg-white px-4 py-2 ring-1 ring-black/10 hover:bg-slate-50"
                        >
                            Clear
                        </button>
                        <button
                            onClick={runExtractTodos}
                            disabled={!noteBody.trim() || isRunning}
                            className="rounded-lg bg-white px-4 py-2 ring-1 ring-black/10 hover:bg-slate-50 disabled:opacity-60"
                        >
                            Extract To-Dos
                        </button>

                        <label className="ml-auto inline-flex items-center gap-2 text-sm text-slate-600">
                            <input
                                type="checkbox"
                                checked={autoSave}
                                onChange={e => setAutoSave(e.target.checked)}
                                className="h-4 w-4"
                            />
                            Auto-save as note
                        </label>
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
                                    onClick={() => openNote(n)}
                                    className="min-w-[260px] snap-start rounded-xl border border-slate-200 bg-white p-3 shadow-sm cursor-pointer hover:ring-2 hover:ring-emerald-300 transition"
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={(e)=>{ if(e.key==='Enter' || e.key===' ') openNote(n); }}
                                    aria-label="Open note"
                                >
                                    <div className="relative max-h-28 overflow-hidden text-sm leading-6">
                                        <ReactMarkdown
                                            remarkPlugins={[remarkGfm]}
                                            components={{
                                                h1: (p) => <h1 className="text-base font-bold mt-2 mb-1" {...p} />,
                                                h2: (p) => <h2 className="text-base font-semibold mt-2 mb-1" {...p} />,
                                                h3: (p) => <h3 className="text-sm font-semibold mt-1 mb-1" {...p} />,
                                                p:  (p) => <p className="my-1" {...p} />,
                                                ul: (p) => <ul className="list-disc pl-4 my-1" {...p} />,
                                                ol: (p) => <ol className="list-decimal pl-4 my-1" {...p} />,
                                                li: (p) => <li className="my-0.5" {...p} />,
                                                code({inline, children, ...props}) {
                                                    return inline ? (
                                                        <code className="px-1 py-0.5 rounded bg-slate-100" {...props}>{children}</code>
                                                    ) : (
                                                        <pre className="p-2 rounded bg-slate-900 text-slate-100 overflow-auto text-xs">
                                                            <code {...props}>{children}</code>
                                                        </pre>
                                                    );
                                                }
                                            }}
                                        >
                                            {n.body}
                                        </ReactMarkdown>

                                        {/* fade nhẹ để giả lập “clamp” nhiều dòng */}
                                        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-white to-transparent" />
                                    </div>

                                    <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
                                        <span>{new Date(n.createdAt).toLocaleString()}</span>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); deleteNote(n.id); }}
                                            className="text-slate-400 hover:text-red-600"
                                            title="Delete"
                                            aria-label="Delete note"
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
                
                {viewerOpen && activeNote && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true">
                        {/* overlay: click để đóng */}
                        <div className="absolute inset-0 bg-black/40" onClick={closeViewer} />

                        {/* panel */}
                        <div className="relative z-10 w-[min(92vw,900px)] max-h-[85vh] overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-black/10">
                            <header className="flex items-center justify-between px-5 py-3 border-b border-slate-200">
                                <div className="text-sm text-slate-500">{new Date(activeNote.createdAt).toLocaleString()}</div>
                                <button
                                    onClick={closeViewer}
                                    className="rounded p-2 hover:bg-slate-100"
                                    aria-label="Close"
                                    title="Close"
                                >
                                    ✕
                                </button>
                            </header>

                            <div className="px-5 py-4 overflow-auto max-h-[75vh]">
                                <ReactMarkdown
                                    remarkPlugins={[remarkGfm]}
                                    components={{
                                        h1: (p) => <h1 className="text-xl font-bold mt-3 mb-1" {...p} />,
                                        h2: (p) => <h2 className="text-lg font-semibold mt-3 mb-1" {...p} />,
                                        h3: (p) => <h3 className="text-base font-semibold mt-2 mb-1" {...p} />,
                                        p:  (p) => <p className="my-2" {...p} />,
                                        ul: (p) => <ul className="list-disc pl-5 my-2" {...p} />,     // <-- thêm bullet
                                        ol: (p) => <ol className="list-decimal pl-5 my-2" {...p} />,   // <-- thêm numbering
                                        li: (p) => <li className="my-1" {...p} />,
                                        code({inline, children, ...props}) {
                                            return inline ? (
                                                <code className="px-1 py-0.5 rounded bg-slate-100" {...props}>{children}</code>
                                            ) : (
                                                <pre className="p-3 rounded bg-slate-900 text-slate-100 overflow-auto text-sm">
                                                    <code {...props}>{children}</code>
                                                </pre>
                                            );
                                        }
                                    }}
                                >
                                    {activeNote.body}
                                </ReactMarkdown>
                            </div>

                        </div>
                    </div>
                )}


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
							className="mt-3 h-40 w-full rounded-lg border border-yellow-200 bg-white/60 p-3 focus:outline-none focus:ring-2 focus:ring-emerald-400"
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
								className="flex-1 rounded-lg border border-slate-200 p-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-400"
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
								<li key={t.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-2">
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
