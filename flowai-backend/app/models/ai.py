from pydantic import BaseModel
from typing import List, Optional

class PlanGoalRequest(BaseModel):
	title: str = ""
	desc: str = ""
	due: Optional[str] = None	# yyyy-mm-dd
	scope: str = "weekly"		# daily | weekly | monthly
	locale: Optional[str] = "vi-VN"
	model: Optional[str] = None	# override nếu muốn

class Subtask(BaseModel):
	id: int
	text: str
	duration: float
	dateStr: Optional[str] = None

class PlanGoalResponse(BaseModel):
	subtasks: List[Subtask]
	notes: Optional[str] = None
