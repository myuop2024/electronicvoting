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
COPY main.py ./main.py
ENV PYTHONPATH=/app/src
CMD ["uvicorn", "observernet_api.app:create_app", "--factory", "--host", "0.0.0.0", "--port", "8000"]
