function Navbar() {
	return (
		<nav className="flex items-center justify-between px-6 py-4">
			{/* Logo */}
			<div className="flex items-center gap-2">
				<img src="/vite.svg" alt="FlowAI Logo" className="h-10 w-10" />
				<span className="text-gray-700 text-xl font-semibold">FlowAI</span>
			</div>

			{/* Menu */}
			<div className="flex items-center gap-6">
				<a href="#about" className="text-gray-600 hover:text-black">
					About
				</a>
				<button className="bg-white px-4 py-2 rounded-md shadow hover:bg-gray-100">
					Get started
				</button>
			</div>
		</nav>
	);
}

export default Navbar;
