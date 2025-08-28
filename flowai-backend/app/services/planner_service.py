# app/services/planner_service.py
import json, re, math
import requests
from datetime import date, datetime, timedelta, time
from typing import List, Dict, Any, Tuple

from app.core.config import settings

# ========= LLM (Gemini via REST) =========
_GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}"

def _prompt(goal: str, timeframe: str, desc: str, due: str, locale: str) -> str:
	return "\n".join([
		"Bạn là trợ lý lập kế hoạch & quản trị công việc.",
		"Yêu cầu:",
		"1) Tách goal thành 3–7 subtasks NGẮN GỌN.",
		"2) Ước lượng duration theo GIỜ (số nguyên; 1,2,3...).",
		"3) Nếu suy luận được ngày phù hợp trước hạn, thêm dateStr (yyyy-mm-dd); nếu không thì để trống.",
		"4) Chỉ trả JSON với các field: { subtasks: [{id?, text, duration, dateStr?}], notes? }",
		"",
		f"Locale: {locale}",
		f"Timeframe: {timeframe} (day|week|month)",
		f"Title/Goal: {goal}",
		f"Description: {desc or ''}",
		f"Due: {due or ''}"
	])

def _call_gemini(goal: str, timeframe: str, desc: str = "", due: str = "", locale: str = "vi-VN") -> Dict[str, Any]:
	if not settings.GEMINI_API_KEY:
		raise RuntimeError("Missing GEMINI_API_KEY")
	url = _GEMINI_URL.format(model=settings.GEMINI_MODEL, key=settings.GEMINI_API_KEY)
	payload = {
		"contents": [{"role": "user", "parts": [{"text": _prompt(goal, timeframe, desc, due, locale)}]}],
		"generationConfig": {"response_mime_type": "application/json"}
	}
	resp = requests.post(url, json=payload, timeout=60)
	resp.raise_for_status()
	data = resp.json()
	txt = data["candidates"][0]["content"]["parts"][0]["text"]
	return json.loads(txt)

# ========= Heuristic fallback (khi model lỗi) =========
def _smart_split(text: str) -> List[str]:
	text = (text or "").replace("\r", "")
	parts = re.split(r"\n|[•\-–]\s+|\d+\.\s+|[.;]", text)
	parts = [p.strip() for p in parts if p and p.strip()]
	seen, out = set(), []
	for p in parts:
		if p not in seen:
			seen.add(p)
			out.append(p)
	if not out:
		out = ["Phân tích yêu cầu", "Thực hiện phần chính", "Tổng hợp & viết báo cáo"]
	return out[:7]

def _estimate_duration(s: str) -> float:
	s = s.lower()
	m = re.search(r"(\d+(?:\.\d+)?)\s*(h|hr|hour|hours)\b", s)
	if m: return max(1.0, math.ceil(float(m.group(1))))
	m = re.search(r"(\d+)\s*(m|min|minute|minutes)\b", s)
	if m: return max(1.0, math.ceil(int(m.group(1))/60))
	if re.search(r"(research|design|plan|proposal)", s): return 2.0
	if re.search(r"(implement|code|build|integrate|refactor)", s): return 2.0
	if re.search(r"(write|draft|report|doc|slides|present)", s): return 1.5
	if re.search(r"(test|review|lint|fix|debug)", s): return 1.0
	return 1.0

def _fallback_plan(goal: str, desc: str = "") -> Dict[str, Any]:
	text = (desc or "") + "\n" + (goal or "")
	items = _smart_split(text)
	return {
		"subtasks": [{"id": i+1, "text": it, "duration": _estimate_duration(it)} for i, it in enumerate(items)],
		"notes": "fallback_local"
	}

# ========= Public: Plan goals =========
def plan_goals(goal: str, timeframe: str = "week", desc: str = "", due: str = "", locale: str = "vi-VN") -> List[Dict[str, Any]]:
	"""
	returns: list[{id, text, duration, dateStr?}]
	"""
	try:
		raw = _call_gemini(goal, timeframe, desc, due, locale)
	except Exception:
		raw = _fallback_plan(goal, desc)

	# sanitize
	subtasks = raw.get("subtasks", [])
	out = []
	for i, t in enumerate(subtasks, 1):
		text = str(t.get("text", "")).strip()
		if not text: continue
		duration = float(t.get("duration") or 1)
		if duration < 1: duration = 1
		out.append({
			"id": int(t.get("id") or i),
			"text": text,
			"duration": int(math.ceil(duration)),
			"dateStr": t.get("dateStr")
		})
	return out

# ========= Scheduling =========
def _parse_work_hours(s: str) -> Tuple[time, time]:
	# "09:00-17:00"
	try:
		start_str, end_str = s.split("-", 1)
		h1, m1 = [int(x) for x in start_str.split(":")]
		h2, m2 = [int(x) for x in end_str.split(":")]
		return time(h1, m1), time(h2, m2)
	except Exception:
		return time(9, 0), time(17, 0)

def _is_weekday(d: date) -> bool:
	return d.weekday() < 5  # Mon..Fri

def _next_workday(d: date) -> date:
	cur = d
	while not _is_weekday(cur):
		cur += timedelta(days=1)
	return cur

def _add_hours(dt: datetime, hours: float) -> datetime:
	return dt + timedelta(hours=hours)

def schedule_tasks(tasks: List[Dict[str, Any]], start_date: str, work_hours: str = "09:00-17:00", tz: str = "Asia/Ho_Chi_Minh") -> List[Dict[str, Any]]:
	"""
	Input tasks: [{text, duration (hours), id? , dateStr?}, ...]
	Output: list events [{title, dateStr, start, end, duration, id}]
	- Ưu tiên đặt vào ngày chỉ định nếu task có dateStr và là ngày làm việc.
	- Tránh khung trưa 12:00–13:00.
	- Nếu hết slot trong ngày → sang ngày làm việc tiếp theo.
	"""
	# parse work hours
	t_start, t_end = _parse_work_hours(work_hours)
	lunch_start, lunch_end = time(12, 0), time(13, 0)

	cur_date = _next_workday(datetime.fromisoformat(start_date).date())
	cur_dt = datetime.combine(cur_date, t_start)

	events: List[Dict[str, Any]] = []

	def _place_on_day(day: date, duration_h: float) -> Tuple[datetime, datetime]:
		nonlocal cur_dt
		start_dt = datetime.combine(day, cur_dt.time())
		end_dt = _add_hours(start_dt, duration_h)

		# nếu cắt qua giờ trưa → chia đôi: trước trưa + sau trưa
		lunch_s = datetime.combine(day, lunch_start)
		lunch_e = datetime.combine(day, lunch_end)

		if start_dt < lunch_s and end_dt > lunch_s:
			# phần trước trưa
			before = (lunch_s - start_dt).total_seconds() / 3600.0
			if before > 0:
				# đặt trước trưa
				e1_end = lunch_s
				# CHÚ Ý: để đơn giản, đẩy toàn bộ block sang sau trưa nếu không đủ trước trưa
				# → chuyển sang sau trưa
				pass

			# chuyển cả block sau trưa
			start_dt = lunch_e
			end_dt = _add_hours(start_dt, duration_h)

		# nếu vượt quá giờ làm việc → chuyển sang ngày hôm sau
		day_end = datetime.combine(day, t_end)
		if end_dt > day_end:
			return None, None

		return start_dt, end_dt

	for idx, t in enumerate(tasks, 1):
		title = str(t.get("text", "")).strip()
		if not title: continue
		dur = int(math.ceil(float(t.get("duration") or 1)))
		if dur < 1: dur = 1

		# nếu task có dateStr → đặt lại con trỏ ngày
		task_date_str = t.get("dateStr")
		if task_date_str:
			try:
				td = datetime.fromisoformat(task_date_str).date()
				if _is_weekday(td):
					cur_date = td
					cur_dt = datetime.combine(cur_date, t_start)
				else:
					# nếu rơi cuối tuần, dời đến ngày làm việc kế
					cur_date = _next_workday(td)
					cur_dt = datetime.combine(cur_date, t_start)
			except Exception:
				pass

		# thử đặt vào ngày hiện tại (và cuộn ngày nếu cần)
		while True:
			cur_date = _next_workday(cur_date)
			start_end = _place_on_day(cur_date, dur)
			if start_end != (None, None):
				start_dt, end_dt = start_end
				events.append({
					"id": t.get("id") or idx,
					"title": title,
					"dateStr": start_dt.date().isoformat(),
					"start": start_dt.strftime("%H:%M"),
					"end": end_dt.strftime("%H:%M"),
					"duration": dur,
					"timezone": tz
				})
				# cập nhật con trỏ thời gian cho task tiếp theo
				cur_dt = end_dt
				# nếu vượt quá giờ làm việc → chuyển sang đầu ngày kế
				if cur_dt.time() >= t_end:
					cur_date = cur_date + timedelta(days=1)
					cur_dt = datetime.combine(cur_date, t_start)
				break
			else:
				# không đủ chỗ trong ngày → nhảy sang ngày sau, đặt lại giờ bắt đầu
				cur_date = cur_date + timedelta(days=1)
				cur_dt = datetime.combine(cur_date, t_start)

	return events

# ========= ICS =========
def _pad2(n: int) -> str:
	return str(n).zfill(2)

def _dtstamp(dt: datetime) -> str:
	return dt.strftime("%Y%m%dT%H%M%SZ")

def _dtlocal(d: date, hhmm: str) -> str:
	h, m = [int(x) for x in hhmm.split(":")]
	return f"{d.year}{_pad2(d.month)}{_pad2(d.day)}T{_pad2(h)}{_pad2(m)}00"

def make_ics(scheduled: List[Dict[str, Any]], calendar_name: str = "FlowAI Plan") -> str:
	now = datetime.utcnow()
	lines = [
		"BEGIN:VCALENDAR",
		"VERSION:2.0",
		"PRODID:-//FlowAI//Planner//EN",
		f"X-WR-CALNAME:{calendar_name}"
	]
	for ev in scheduled:
		ds = ev["dateStr"]
		start = _dtlocal(datetime.fromisoformat(ds).date(), ev["start"])
		end = _dtlocal(datetime.fromisoformat(ds).date(), ev["end"])
		uid = f"flowai-{ev.get('id','x')}-{ds.replace('-','')}-{ev['start'].replace(':','')}"
		summary = ev.get("title","Task")
		lines += [
			"BEGIN:VEVENT",
			f"UID:{uid}@flowai",
			f"DTSTAMP:{_dtstamp(now)}",
			f"DTSTART:{start}",
			f"DTEND:{end}",
			f"SUMMARY:{summary}",
			"END:VEVENT"
		]
	lines.append("END:VCALENDAR")
	return "\r\n".join(lines)
