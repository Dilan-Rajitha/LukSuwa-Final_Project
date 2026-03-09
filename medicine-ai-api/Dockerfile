# Use the official FastAPI base image
FROM tiangolo/uvicorn-gunicorn-fastapi:python3.9

# Set the working directory
WORKDIR /app

# Install dependencies
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy the FastAPI app files
COPY . .

# Run the app with uvicorn (port 8000)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
