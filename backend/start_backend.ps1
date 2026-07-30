Write-Host "Starting ResolveAI Unified Python Backend on Port 8080..."
python -m uvicorn app.main:app --host 0.0.0.0 --port 8080 --reload
