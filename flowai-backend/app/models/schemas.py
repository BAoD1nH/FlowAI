from pydantic import BaseModel

class TextSummarizeRequest(BaseModel):
	text: str
	style: str = "bullet"

class SummarizeResponse(BaseModel):
	mode: str
	summary: str
