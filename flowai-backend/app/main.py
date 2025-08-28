# app/main.py
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from typing import Optional, List
import datetime as dt

from app.core.config import settings
from app.services.summarize_service import summarize_text_long, summarize_image
from app.services.pdf_service import extract_text_from_pdf
from app.services.planner_service import plan_goals, schedule_tasks, make_ics

# ===== FastAPI app (PHẢI khai báo trước khi dùng @app.*) =====
app = FastAPI(title="FlowAI Summarizer", version="0.1.0")

# ===== CORS =====
app.add_middleware(
	CORSMiddleware,
	allow_origins=settings.CORS_ORIGINS,
	allow_credentials=True,
	allow_methods=["*"],
	allow_headers=["*"],
)

from app.core.ai_router import router as ai_router
app.include_router(ai_router)
for r in app.router.routes:
    try:
        print("ROUTE:", r.path, list(getattr(r, "methods", [])))
    except Exception:
        pass


# ===== Helper: map lỗi quota thành 402 =====
def _httpize_exception(e: Exception):
	msg = str(e)
	low = msg.lower()
	if "insufficient_quota" in low or "exceeded your current quota" in low:
		raise HTTPException(status_code=402, detail="Out of credits or billing inactive.")
	return JSONResponse({"error": msg}, status_code=500)

# ===== Health =====
@app.get("/health")
def health():
	return {"status": "ok"}

# ===== Summarize: TEXT =====
@app.post("/summarize/text")
async def summarize_text_endpoint(
	text: str = Form(..., description="raw text to summarize"),
	style: str = Form("bullet")
):
	try:
		summary = summarize_text_long(text, style=style)
		return {"mode": "text", "summary": summary}
	except Exception as e:
		return _httpize_exception(e)

# ===== Summarize: PDF =====
@app.post("/summarize/pdf")
async def summarize_pdf_endpoint(
	file: UploadFile = File(...),
	style: str = Form("bullet")
):
	try:
		data = await file.read()
		full_text = extract_text_from_pdf(data)
		if not full_text:
			raise HTTPException(status_code=422, detail="No extractable text in PDF (try OCR workflow).")
		summary = summarize_text_long(full_text, style=style)
		return {"mode": "pdf", "summary": summary}
	except HTTPException:
		raise
	except Exception as e:
		return _httpize_exception(e)

# ===== Summarize: IMAGE =====
@app.post("/summarize/image")
async def summarize_image_endpoint(
	file: UploadFile = File(...),
	style: str = Form("bullet")
):
	try:
		img_bytes = await file.read()
		content_type = file.content_type or "image/png"
		summary = summarize_image(img_bytes, content_type=content_type, style=style)
		return {"mode": "image", "summary": summary}
	except Exception as e:
		return _httpize_exception(e)

# ===== NOTE: summarize current note =====
@app.post("/ai/summarize-note")
async def summarize_note_endpoint(
	text: str = Form(...),
	style: str = Form("bullet")
):
	try:
		return {"mode": "note", "summary": summarize_text_long(text, style=style)}
	except Exception as e:
		return _httpize_exception(e)

# ===== NOTE: extract todos (bulleted) =====
@app.post("/ai/extract-todos")
async def extract_todos_endpoint(text: str = Form(...)):
	try:
		prompt = (
			"From the following note, extract a concise checklist of actionable items. "
			"Return bullet points only:\n\n" + text
		)
		return {"todos": summarize_text_long(prompt, style="bullet")}
	except Exception as e:
		return _httpize_exception(e)

# ===== TRACKER: plan goals -> tasks =====
@app.post("/ai/plan-goals")
async def plan_goals_endpoint(payload: dict = Body(...)):
	try:
		goal = (payload.get("goal") or "").strip()
		timeframe = payload.get("timeframe", "week")
		if not goal:
			raise HTTPException(status_code=400, detail="Missing 'goal'")
		tasks = plan_goals(goal, timeframe)
		return {"tasks": tasks}
	except HTTPException:
		raise
	except Exception as e:
		return _httpize_exception(e)

# ===== TRACKER: auto schedule tasks =====
@app.post("/ai/schedule")
async def schedule_endpoint(payload: dict = Body(...)):
	try:
		tasks = payload.get("tasks", [])
		start_date = payload.get("start_date") or dt.date.today().isoformat()
		work_hours = payload.get("work_hours", "09:00-17:00")
		tz = payload.get("timezone", "Asia/Ho_Chi_Minh")
		scheduled = schedule_tasks(tasks, start_date, work_hours, tz)
		return {"scheduled": scheduled}
	except Exception as e:
		return _httpize_exception(e)

# ===== Calendar: export ICS =====
@app.post("/calendar/export-ics")
async def export_ics_endpoint(payload: dict = Body(...)):
	try:
		scheduled = payload.get("scheduled", [])
		ics = make_ics(scheduled, calendar_name=payload.get("calendar_name", "FlowAI Plan"))
		headers = {"Content-Disposition": 'attachment; filename="flowai_plan.ics"'}
		return Response(content=ics, media_type="text/calendar", headers=headers)
	except Exception as e:
		return _httpize_exception(e)

@app.get("/debug/llm", include_in_schema=False)
def debug_llm():
	from app.core.config import settings
	key = settings.GEMINI_API_KEY or ""
	return {
		"provider": settings.LLM_PROVIDER,
		"model": settings.GEMINI_MODEL,
		"key_prefix": key[:6],
		"has_key": bool(key)
	}
