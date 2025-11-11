FROM python:3.12-slim
WORKDIR /app
COPY pyproject.toml ./
RUN pip install poetry==1.7.1 && poetry config virtualenvs.create false && poetry install --without dev
COPY src ./src
COPY main.py ./main.py
ENV PYTHONPATH=/app/src
CMD ["uvicorn", "verifier.app:create_app", "--factory", "--host", "0.0.0.0", "--port", "8080"]
