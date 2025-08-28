from fastapi import APIRouter, HTTPException
from app.models.ai import PlanGoalRequest, PlanGoalResponse
from app.services.ai_planner import plan_goal

router = APIRouter(prefix="/api/ai", tags=["ai"])

@router.post("/plan_goal", response_model=PlanGoalResponse)
def plan_goal_route(req: PlanGoalRequest) -> PlanGoalResponse:
	try:
		return plan_goal(req)
	except Exception as e:
		raise HTTPException(status_code=500, detail=str(e))
