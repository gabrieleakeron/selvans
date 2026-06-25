FROM python:3.13-slim

WORKDIR /app

COPY pyproject.toml .
RUN pip install --no-cache-dir -e .

COPY Selvans_core/ Selvans_core/

RUN mkdir -p /data

EXPOSE 8080

CMD ["uvicorn", "Selvans_core.main:app", "--host", "0.0.0.0", "--port", "8080"]
