import uvicorn

from verifier import create_app

app = create_app()

if __name__ == "__main__":
    uvicorn.run("verifier.app:create_app", host="0.0.0.0", port=8080, factory=True)
