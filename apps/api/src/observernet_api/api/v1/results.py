from fastapi import APIRouter

router = APIRouter()


@router.get("/{election_id}")
async def get_results(election_id: str):
    # TODO: fetch online vs offline counts from DB and Fabric tallies
    return {
        "election_id": election_id,
        "online": {"total": 1200},
        "offline": {"total": 45},
        "totals": {"total": 1245}
    }


@router.get("/{election_id}/embed")
async def get_results_embed(election_id: str):
    # TODO: generate chart config payload
    return {
        "charts": [
            {
                "type": "bar",
                "label": "Turnout",
                "data": [
                    {"channel": "web", "votes": 1000},
                    {"channel": "whatsapp", "votes": 200},
                    {"channel": "offline", "votes": 45}
                ]
            }
        ]
    }
