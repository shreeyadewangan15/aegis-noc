# Air-Gapped AegisNOC Backend Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Prevent python from writing pyc files and buffering stdout
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV AIRGAP_STRICT_ENFORCE=true

# Copy requirements
COPY backend/requirements.txt /app/backend/requirements.txt

# Install python dependencies locally
RUN pip install --no-cache-dir -r /app/backend/requirements.txt

# Copy source code and topology data
COPY backend /app/backend
COPY scripts /app/scripts

EXPOSE 8000

CMD ["python3", "backend/run_backend.py"]
