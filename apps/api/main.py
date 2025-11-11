import uvicorn

from observernet_api import create_app

app = create_app()


if __name__ == "__main__":
    uvicorn.run("observernet_api.app:create_app", host="0.0.0.0", port=8000, factory=True)
