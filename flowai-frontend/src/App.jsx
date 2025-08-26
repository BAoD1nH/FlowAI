// src/App.jsx
function FeatureCard({ icon, title, desc, href }) {
	return (
		<div className="rounded-2xl bg-white/70 backdrop-blur shadow-lg ring-1 ring-black/5 p-6 transition
			hover:-translate-y-1 hover:shadow-xl">
			<div className="text-3xl mb-4">{icon}</div>
			<h3 className="text-xl font-semibold text-emerald-900">{title}</h3>
			<p className="mt-2 text-emerald-800/80">{desc}</p>
			<div className="mt-5">
				<a
					href={href}
					className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-white
						hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
				>
					Open <i className="fa-solid fa-arrow-right"></i>
				</a>
			</div>
		</div>
	);
}

function App() {
	const scrollToPlatform = () => {
		document.getElementById("platform")?.scrollIntoView({ behavior: "smooth", block: "start" });
	};

	return (
		<div className="min-h-screen flex flex-col bg-gradient-to-b from-green-100 to-green-300 text-slate-800 font-sans">
			{/* NAVBAR */}
			<header className="max-w-6xl mx-auto w-full px-5 py-4 flex items-center justify-between">
				<div className="flex items-center gap-3">
					<img src="/vite.svg" alt="FlowAI" className="h-10 w-10 rounded" />
					<span className="text-lg font-semibold text-slate-500">FlowAI</span>
				</div>
				<nav className="flex items-center gap-6">
					<a href="#about" className="text-slate-400 hover:text-slate-600 transition">About</a>
					<a
						href="#get-started"
						className="inline-block rounded-xl bg-white px-4 py-2 shadow ring-1 ring-black/5 hover:bg-slate-50"
					>
						Get started
					</a>
				</nav>
			</header>

			{/* HERO */}
			<main className="flex-1 flex items-center justify-center text-center px-5">
				<div className="max-w-4xl">
					<h1 className="text-6xl md:text-7xl font-extrabold text-emerald-900 tracking-tight">FlowAI</h1>
					<p className="mt-6 text-xl md:text-2xl text-emerald-800/90">
						A tools powered by AI to make your day more productive
					</p>
					<div className="mt-8">
						<button
							onClick={scrollToPlatform}
							className="rounded-xl bg-white px-6 py-3 md:px-8 md:py-4 text-lg md:text-xl shadow-lg ring-1 ring-black/5
							 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
						>
							Explore platform
						</button>
					</div>
				</div>
			</main>

			{/* PLATFORM GRID */}
			<section id="platform" className="py-16 md:py-24">
                <div className="max-w-6xl mx-auto px-5">
                    <h2 className="text-3xl md:text-4xl font-extrabold text-emerald-900 text-center">
                        Explore tools
                    </h2>
                    <p className="mt-3 text-center text-emerald-800/80">
                        Pick a tool to get started
                    </p>

                    <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FeatureCard
                            icon={<i className="fa-regular fa-note-sticky"></i>}
                            title="AI Note Assistant"
                            desc="Tóm tắt, sắp xếp ý chính, tạo checklist và nhắc việc từ ghi chú của bạn."
                            href="#note"
                        />
                        <FeatureCard
                            icon={<i className="fa-solid fa-chart-line"></i>}
                            title="Productivity Tracker"
                            desc="Theo dõi thời gian, thói quen và mục tiêu. Nhận báo cáo hiệu suất hằng tuần."
                            href="#tracker"
                        />
                    </div>
                </div>
            </section>

			{/* DETAIL SECTIONS (tuỳ ý, có thể ẩn/hiện sau) */}
			<section id="note" className="py-16">
				<div className="max-w-6xl mx-auto px-5 grid md:grid-cols-2 gap-8 items-center">
					<div className="rounded-2xl bg-white/70 backdrop-blur p-8 shadow ring-1 ring-black/5">
						<h3 className="text-2xl font-bold text-emerald-900">AI Note Assistant</h3>
						<ul className="mt-4 space-y-2 text-emerald-800/90">
							<li>• Tự động tóm tắt & highlight</li>
							<li>• Sinh to-do từ ghi chú</li>
							<li>• Nhắc lịch thông minh từ câu chữ</li>
						</ul>
						<div className="mt-6 flex gap-3">
							<button className="rounded-lg bg-emerald-600 text-white px-4 py-2 hover:bg-emerald-700">
								Try now
							</button>
							<button className="rounded-lg bg-white px-4 py-2 ring-1 ring-black/10 hover:bg-slate-50">
								Learn more
							</button>
						</div>
					</div>
					<div className="hidden md:block text-8xl text-emerald-900/20 text-center">📝</div>
				</div>
			</section>

			<section id="tracker" className="py-16">
				<div className="max-w-6xl mx-auto px-5 grid md:grid-cols-2 gap-8 items-center">
					<div className="hidden md:block text-8xl text-emerald-900/20 text-center">📈</div>
					<div className="rounded-2xl bg-white/70 backdrop-blur p-8 shadow ring-1 ring-black/5">
						<h3 className="text-2xl font-bold text-emerald-900">Productivity Tracker</h3>
						<ul className="mt-4 space-y-2 text-emerald-800/90">
							<li>• Theo dõi thời gian & thói quen</li>
							<li>• Mục tiêu tuần/tháng, nhắc deadline</li>
							<li>• Báo cáo hiệu suất & xu hướng</li>
						</ul>
						<div className="mt-6 flex gap-3">
							<button className="rounded-lg bg-emerald-600 text-white px-4 py-2 hover:bg-emerald-700">
								Start tracking
							</button>
							<button className="rounded-lg bg-white px-4 py-2 ring-1 ring-black/10 hover:bg-slate-50">
								View demo
							</button>
						</div>
					</div>
				</div>
			</section>

			{/* FOOTER */}
			<footer className="py-8">
				<div className="flex justify-center gap-6 text-2xl text-emerald-900/80">
					<a aria-label="Facebook" className="hover:text-black" href="#"><i className="fa-brands fa-facebook"></i></a>
					<a aria-label="LinkedIn" className="hover:text-black" href="#"><i className="fa-brands fa-linkedin"></i></a>
					<a aria-label="YouTube" className="hover:text-black" href="#"><i className="fa-brands fa-youtube"></i></a>
					<a aria-label="Instagram" className="hover:text-black" href="#"><i className="fa-brands fa-instagram"></i></a>
				</div>
			</footer>
		</div>
	);
}
export default App;
