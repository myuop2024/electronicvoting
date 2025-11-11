FROM python:3.12-slim AS builder
WORKDIR /app
ENV POETRY_VERSION=1.7.1
RUN pip install "poetry==$POETRY_VERSION"
COPY pyproject.toml ./
RUN poetry export -f requirements.txt --output requirements.txt --without-hashes

FROM python:3.12-slim
WORKDIR /app
COPY --from=builder /app/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY src ./src
ENV PYTHONPATH=/app/src
CMD ["celery", "-A", "observernet_worker.celery_app", "worker", "--loglevel=info"]
