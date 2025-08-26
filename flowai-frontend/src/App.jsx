import { Link } from 'react-router-dom'

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
                            href="/note"
                        />
                        <FeatureCard
                            icon={<i className="fa-solid fa-chart-line"></i>}
                            title="Productivity Tracker"
                            desc="Theo dõi thời gian, thói quen và mục tiêu. Nhận báo cáo hiệu suất hằng tuần."
                            href="/tracker"
                        />
                    </div>
                </div>
            </section>

			{/* DETAIL SECTIONS (tuỳ ý, có thể ẩn/hiện sau) */}
			<section id="features" className="py-16">
				<div className="max-w-6xl mx-auto px-5">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
					{/* Card 1: AI Note Assistant */}
					<div id="note" className="rounded-2xl bg-white/70 backdrop-blur p-8 shadow ring-1 ring-black/5">
						<h3 className="text-2xl font-bold text-emerald-900">AI Note Assistant</h3>
						<p className="mt-2 text-emerald-800/85">
						Biến ghi chú thành checklist hành động, highlight điểm chính và gợi ý lịch tự động.
						</p>
						<ul className="mt-4 space-y-2 text-emerald-800/90">
						<li>• Upload file/ảnh hoặc dán văn bản; hiểu ngữ cảnh tiếng Việt tốt</li>
						<li>• Tóm tắt thông minh (key points, outline) + highlight trích dẫn</li>
						<li>• Sinh checklist + deadline, gợi ý lịch (sẵn sàng đồng bộ Calendar)</li>
						</ul>
						<div className="mt-6 flex gap-3">
						<a href="#upload" className="rounded-lg bg-emerald-600 text-white px-4 py-2 hover:bg-emerald-700">Try now</a>
						<a href="#how" className="rounded-lg bg-white px-4 py-2 ring-1 ring-black/10 hover:bg-slate-50">Learn more</a>
						</div>
					</div>

					{/* Card 2: Productivity Tracker */}
					<div id="tracker" className="rounded-2xl bg-white/70 backdrop-blur p-8 shadow ring-1 ring-black/5">
						<h3 className="text-2xl font-bold text-emerald-900">Productivity Tracker</h3>
						<p className="mt-2 text-emerald-800/85">
						Đặt mục tiêu, theo dõi thói quen và xem lịch kiểu Google Calendar — tất cả trong một nơi.
						</p>
						<ul className="mt-4 space-y-2 text-emerald-800/90">
						<li>• Goals ngày / tuần / tháng + mức độ ưu tiên</li>
						<li>• Checklist & habit tracking; trạng thái Todo → Doing → Done</li>
						<li>• Đồng bộ Google Calendar; báo cáo hiệu suất tuần/tháng</li>
						</ul>
						<div className="mt-6 flex gap-3">
						<a href="#dashboard" className="rounded-lg bg-emerald-600 text-white px-4 py-2 hover:bg-emerald-700">Start tracking</a>
						<a href="#benefits" className="rounded-lg bg-white px-4 py-2 ring-1 ring-black/10 hover:bg-slate-50">View demo</a>
						</div>
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
