import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator

class Settings(BaseSettings):
	model_config = SettingsConfigDict(env_file=".env", extra="ignore")

	# ===== Chọn nhà cung cấp LLM =====
	# "gemini" (mặc định) hoặc "openai"
	LLM_PROVIDER: str = "gemini"

	# ===== Gemini =====
	GEMINI_API_KEY: str = ""
	# Bạn đang dùng Gemini 2.0 Flash:
	GEMINI_MODEL: str = "gemini-2.0-flash"  # hoặc "gemini-1.5-flash", "gemini-1.5-pro" nếu cần

	# ===== OpenAI (giữ để linh hoạt chuyển đổi) =====
	OPENAI_API_KEY: str = ""
	OPENAI_MODEL: str = "gpt-4.1"
	# Tuỳ chọn cho OpenAI-compatible server (LM Studio/vLLM...):
	OPENAI_BASE_URL: str = ""

	# ===== CORS =====
	CORS_ORIGINS: List[str] = ["http://localhost:5173"]

	@field_validator("LLM_PROVIDER")
	@classmethod
	def _normalize_provider(cls, v: str) -> str:
		return (v or "").lower().strip() or "gemini"

	@field_validator("CORS_ORIGINS", mode="before")
	@classmethod
	def _split_origins(cls, v):
		if isinstance(v, str):
			return [s.strip() for s in v.split(",") if s.strip()]
		return v

settings = Settings()
