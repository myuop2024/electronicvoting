from celery import Celery

app = Celery(
    "observernet",
    broker="redis://redis:6379/0",
    backend="redis://redis:6379/1",
)

app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    task_track_started=True,
    broker_transport_options={"visibility_timeout": 3600},
)


@app.task(name="observernet.ocr.process")
def process_ocr_task(upload_id: str) -> dict:
    # TODO: fetch object from storage, run OCR + Gemini assist, persist review package
    return {"upload_id": upload_id, "status": "queued"}


@app.task(name="observernet.notifications.send_email")
def send_email_task(recipient: str, template: str, context: dict) -> dict:
    # TODO: dispatch to configured email provider via API key stored in Vault
    return {"recipient": recipient, "template": template, "status": "sent"}
