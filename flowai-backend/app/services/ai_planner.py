import os, json, re, math
import requests
from datetime import datetime
from typing import Dict, Any, List
from dotenv import load_dotenv
from pydantic import TypeAdapter, ValidationError
from app.models.ai import PlanGoalRequest, PlanGoalResponse, Subtask

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
DEFAULT_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
GL_API = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"

# --------- local fallback heuristics ----------
def _smart_split(title: str, desc: str) -> List[str]:
	raw = (desc or "") + "\n" + (title or "")
	chunks = re.split(r"\n|[•\-–]\s+|\d+\.\s+|[.;]", raw)
	chunks = [c.strip() for c in chunks if c and c.strip()]
	# dedup, giới hạn 3–7
	seen, out = set(), []
	for c in chunks:
		if c not in seen:
			seen.add(c)
			out.append(c)
	if not out:
		out = [f"Phân tích yêu cầu cho “{title or 'Mục tiêu'}”", "Thực hiện phần chính", "Tổng hợp & viết báo cáo"]
	return out[:7]

def _estimate_duration(text: str) -> float:
	t = text.lower()
	mh = re.search(r"(\d+(?:\.\d+)?)\s*(h|hr|hour|hours)\b", t)
	if mh:
		return max(0.5, float(mh.group(1)))
	mm = re.search(r"(\d+)\s*(m|min|minute|minutes)\b", t)
	if mm:
		return max(0.5, int(mm.group(1)) / 60)
	if re.search(r"(research|design|plan|proposal)", t): return 2
	if re.search(r"(implement|code|build|integrate|refactor)", t): return 2
	if re.search(r"(write|draft|report|doc|slides|present)", t): return 1.5
	if re.search(r"(test|review|lint|fix|debug)", t): return 1
	return 1

def _fallback_plan(req: PlanGoalRequest) -> Dict[str, Any]:
	parts = _smart_split(req.title, req.desc)
	subtasks = []
	for i, text in enumerate(parts, 1):
		dur = _estimate_duration(text)
		# làm tròn lên 1h để đồng bộ với UI
		dur = max(1, math.ceil(dur))
		subtasks.append({"id": i, "text": text, "duration": dur})
	return {"subtasks": subtasks, "notes": "fallback_local"}

# --------- call Gemini (REST) ----------
def _prompt(req: PlanGoalRequest) -> str:
	return "\n".join([
		"Bạn là trợ lý lập kế hoạch & quản trị công việc.",
		"Yêu cầu:",
		"1) Tách goal thành 3–7 subtasks NGẮN GỌN.",
		"2) Ứớc lượng duration theo GIỜ (số nguyên; cho phép 1,2,3...).",
		"3) Nếu suy luận được ngày phù hợp trước hạn, thêm dateStr (yyyy-mm-dd); nếu không thì để trống.",
		"4) Chỉ trả JSON với các field: { subtasks: [{id?, text, duration, dateStr?}], notes? }",
		"",
		f"Locale: {req.locale}",
		f"Scope: {req.scope} (daily|weekly|monthly)",
		f"Title: {req.title}",
		f"Description: {req.desc}",
		f"Due: {req.due or ''}"
	])

def _call_gemini(req: PlanGoalRequest) -> Dict[str, Any]:
	if not GEMINI_API_KEY:
		raise RuntimeError("Missing GEMINI_API_KEY")
	model = req.model or DEFAULT_MODEL
	url = GL_API.format(model=model) + f"?key={GEMINI_API_KEY}"

	payload = {
		"contents": [{"role": "user", "parts": [{"text": _prompt(req)}]}],
		"generationConfig": {
			"response_mime_type": "application/json"
		}
	}
	r = requests.post(url, json=payload, timeout=60)
	r.raise_for_status()
	data = r.json()

	# lấy JSON string từ candidates -> content -> parts[0].text
	txt = ""
	try:
		txt = data["candidates"][0]["content"]["parts"][0]["text"]
	except Exception:
		raise RuntimeError("LLM returned unexpected structure")
    
	return json.loads(txt)

# --------- public entry ----------
ta_plan = TypeAdapter(PlanGoalResponse)

def _norm_date(s):
    try:
        return datetime.fromisoformat(s).date().isoformat()
    except Exception:
        return None

def plan_goal(req: PlanGoalRequest) -> PlanGoalResponse:
    try:
        raw = _call_gemini(req)
		
    except RuntimeError as e:
        # lỗi cấu hình/quota -> cho nổi lên
        raise
    except Exception:
        raw = _fallback_plan(req)

    subtasks = (raw.get("subtasks", []) or [])[:7]
    for i, s in enumerate(subtasks, 1):
        s["id"] = int(s.get("id") or i)
        s["text"] = str(s.get("text", "")).strip()
        # ép giờ nguyên ≥1 cho khớp calendar grid
        s["duration"] = max(1, math.ceil(float(s.get("duration") or 1)))
        ds = s.get("dateStr")
        s["dateStr"] = _norm_date(ds) if ds else None

    result = {"subtasks": subtasks, "notes": raw.get("notes")}
    try:
        return ta_plan.validate_python(result)
    except ValidationError:
        return ta_plan.validate_python(_fallback_plan(req))
