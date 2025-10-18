FROM python:3.12-slim

WORKDIR /app

# Copy requirements file and install dependencies
COPY backend/requirements.txt .

RUN pip install --upgrade pip && pip install -r requirements.txt

# Copy backend and frontend folders
COPY backend/app ./app
COPY frontend ./frontend

EXPOSE 5001

CMD ["python", "app/main.py"]
