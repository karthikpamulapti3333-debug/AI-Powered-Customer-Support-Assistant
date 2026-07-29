$isFrontend = Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue
$isBackend = Get-NetTCPConnection -LocalPort 8080 -ErrorAction SilentlyContinue
$isAi = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue

if (-not $isAi) {
    Start-Process -FilePath "python" -ArgumentList "-m uvicorn main:app --host 0.0.0.0 --port 8000" -WorkingDirectory "$PSScriptRoot\ai-service" -WindowStyle Hidden
}

if (-not $isBackend) {
    Start-Process -FilePath "powershell.exe" -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File start_backend.ps1" -WorkingDirectory "$PSScriptRoot\backend" -WindowStyle Hidden
}

if (-not $isFrontend) {
    Start-Process -FilePath "powershell.exe" -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File start_frontend.ps1" -WorkingDirectory "$PSScriptRoot\frontend" -WindowStyle Hidden
    Start-Sleep -Seconds 6
}

Start-Process "http://localhost:5173"
