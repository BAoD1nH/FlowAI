import base64
from typing import List
from app.core.config import settings
from app.utils.chunk import split_chunks

# Chọn provider theo .env
_PROVIDER = settings.LLM_PROVIDER.lower().strip()

if _PROVIDER == "gemini":
	# ===== Gemini =====
	import google.generativeai as genai
	genai.configure(api_key=settings.GEMINI_API_KEY)
	_GEMINI_MODEL = settings.GEMINI_MODEL
	_gemini = genai.GenerativeModel(_GEMINI_MODEL)

	def _llm_text(prompt: str, max_tokens: int = 400) -> str:
		resp = _gemini.generate_content(
			prompt,
			generation_config={"max_output_tokens": max_tokens}
		)
		return (resp.text or "").strip()

	def _llm_vision(prompt_text: str, image_bytes: bytes, content_type: str, max_tokens: int = 400) -> str:
		resp = _gemini.generate_content(
			[prompt_text, {"mime_type": content_type, "data": image_bytes}],
			generation_config={"max_output_tokens": max_tokens}
		)
		return (resp.text or "").strip()

else:
	# ===== OpenAI =====
	from openai import OpenAI
	_client = OpenAI(api_key=settings.OPENAI_API_KEY)
	_MODEL = settings.OPENAI_MODEL

	def _llm_text(prompt: str, max_tokens: int = 400) -> str:
		resp = _client.responses.create(
			model=_MODEL,
			input=prompt,
			max_output_tokens=max_tokens
		)
		return resp.output_text.strip()

	def _llm_vision(prompt_text: str, image_bytes: bytes, content_type: str, max_tokens: int = 400) -> str:
		b64 = base64.b64encode(image_bytes).decode("utf-8")
		resp = _client.responses.create(
			model=_MODEL,
			input=[{
				"role": "user",
				"content": [
					{"type": "input_text", "text": prompt_text},
					{"type": "input_image", "image_data": b64, "mime_type": content_type}
				]
			}],
			max_output_tokens=max_tokens
		)
		return resp.output_text.strip()

def _summarize_chunk(chunk: str, style: str = "bullet") -> str:
	prompt = (
		f"You are a precise summarizer.\n"
		f"Summarize the following content in {style} points with key facts preserved.\n"
		f"Avoid hallucinations.\n\nContent:\n{chunk}\n"
	)
	return _llm_text(prompt, max_tokens=400)

def _reduce_partials(partials: List[str], style: str = "bullet") -> str:
	sep = "\n\n"
	merged = sep.join(partials)
	prompt = (
		"Merge these partial summaries into a single, non-redundant summary "
		f"in {style} points:\n{merged}"
	)
	return _llm_text(prompt, max_tokens=600)

def summarize_text_long(text: str, style: str = "bullet") -> str:
	chunks = split_chunks(text, max_chars=8000)
	if not chunks:
		return ""
	if len(chunks) == 1:
		return _summarize_chunk(chunks[0], style=style)
	partials = [_summarize_chunk(c, style=style) for c in chunks]
	return _reduce_partials(partials, style=style)

def summarize_image(image_bytes: bytes, content_type: str = "image/png", style: str = "bullet") -> str:
	return _llm_vision(
		f"Summarize the image in {style} points. Be accurate and concise.",
		image_bytes,
		content_type,
		max_tokens=400
	)
