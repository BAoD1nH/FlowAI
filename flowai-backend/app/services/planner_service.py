# app/services/planner_service.py
from __future__ import annotations
from typing import List, Dict, Any
import datetime as dt
from zoneinfo import ZoneInfo
from icalendar import Calendar, Event
from app.core.config import settings

# --- LLM client: Gemini or OpenAI (khớp với summarize_service.py) ---
_PROVIDER = settings.LLM_PROVIDER.lower().strip()

if _PROVIDER == "gemini":
	import google.generativeai as genai
	genai.configure(api_key=settings.GEMINI_API_KEY)
	_gemini = genai.GenerativeModel(settings.GEMINI_MODEL)

	def _llm_json(prompt: str, max_tokens: int = 700) -> Dict[str, Any]:
		resp = _gemini.generate_content(
			prompt,
			generation_config={"max_output_tokens": max_tokens, "response_mime_type": "application/json"}
		)
		return resp.text and __import__("json").loads(resp.text) or {}

else:
	from openai import OpenAI
	_client = OpenAI(api_key=settings.OPENAI_API_KEY)
	def _llm_json(prompt: str, max_tokens: int = 700) -> Dict[str, Any]:
		resp = _client.responses.create(
			model=settings.OPENAI_MODEL,
			input=prompt,
			max_output_tokens=max_tokens,
			response_format={"type": "json_object"}
		)
		return __import__("json").loads(resp.output_text)

# --- AI: lập kế hoạch từ goal ---
def plan_goals(goal_text: str, timeframe: str = "week") -> List[Dict[str, Any]]:
	prompt = f"""
You are a planning assistant. Break down the user's goal into concrete tasks.
Return JSON with an array "tasks", each item:
{{
	"title": string,
	"description": string,
	"priority": "high"|"medium"|"low",
	"est_minutes": integer (15..240),
	"tags": [string]
}}
Timeframe: {timeframe}
Goal:
{goal_text}
"""
	data = _llm_json(prompt, max_tokens=900)
	tasks = data.get("tasks", [])
	# guardrails tối thiểu
	out = []
	for t in tasks:
		title = str(t.get("title","")).strip() or "Untitled task"
		desc = str(t.get("description","")).strip()
		pri = (t.get("priority") or "medium").lower()
		if pri not in ("high","medium","low"):
			pri = "medium"
		try:
			est = int(t.get("est_minutes", 30))
		except:
			est = 30
		out.append({
			"title": title,
			"description": desc,
			"priority": pri,
			"est_minutes": max(15, min(est, 480)),
			"tags": t.get("tags", [])
		})
	return out

# --- Sắp lịch đơn giản theo khung giờ làm việc ---
def schedule_tasks(tasks: List[Dict[str,Any]], start_date: str, work_hours: str = "09:00-17:00", tz: str = "Asia/Ho_Chi_Minh") -> List[Dict[str,Any]]:
	# work_hours: "HH:MM-HH:MM"
	start_h, end_h = work_hours.split("-")
	wh_start = dt.time.fromisoformat(start_h)
	wh_end = dt.time.fromisoformat(end_h)
	cur = dt.datetime.fromisoformat(start_date + "T" + start_h + ":00").replace(tzinfo=ZoneInfo(tz))

	out = []
	for t in tasks:
		dur = dt.timedelta(minutes=int(t.get("est_minutes",30)))
		slot_start = cur
		slot_end = slot_start + dur
		# nếu vượt qua giờ làm, nhảy sang ngày tiếp theo
		if slot_end.time() > wh_end:
			# sang ngày tiếp theo lúc work start
			cur = (cur + dt.timedelta(days=1)).replace(hour=wh_start.hour, minute=wh_start.minute)
			slot_start = cur
			slot_end = slot_start + dur
		out.append({**t, "start": slot_start.isoformat(), "end": slot_end.isoformat(), "timezone": tz})
		# cập nhật con trỏ thời gian
		cur = slot_end
		# nếu chạm giờ kết thúc, nhảy qua ngày mới
		if cur.time() >= wh_end:
			cur = (cur + dt.timedelta(days=1)).replace(hour=wh_start.hour, minute=wh_start.minute)
	return out

# --- Xuất ICS từ danh sách task đã có start/end ---
def make_ics(scheduled: List[Dict[str,Any]], calendar_name: str = "FlowAI Plan") -> bytes:
	cal = Calendar()
	cal.add("prodid", "-//FlowAI//Planner//EN")
	cal.add("version", "2.0")
	cal.add("X-WR-CALNAME", calendar_name)

	for t in scheduled:
		ev = Event()
		ev.add("summary", t.get("title","Task"))
		desc = t.get("description","")
		ev.add("description", desc)
		# thời gian
		start = dt.datetime.fromisoformat(t["start"])
		end = dt.datetime.fromisoformat(t["end"])
		ev.add("dtstart", start)
		ev.add("dtend", end)
		cal.add_component(ev)

	return cal.to_ical()
