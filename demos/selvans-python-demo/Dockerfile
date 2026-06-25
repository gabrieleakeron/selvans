FROM python:3.11-slim

WORKDIR /app

# Install selvans-python library first (as editable install source)
COPY packages/selvans-python/ /packages/selvans-python/

COPY demos/selvans-python-demo/pyproject.toml .
# pyproject.toml references selvans via path — replace with the copied location
RUN pip install --no-cache-dir /packages/selvans-python && \
    pip install --no-cache-dir uvicorn[standard]

COPY demos/selvans-python-demo/main.py .

EXPOSE 8001

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
