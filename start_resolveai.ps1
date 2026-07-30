$isFrontend = Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue
$isBackend = Get-NetTCPConnection -LocalPort 8080 -State Listen -ErrorAction SilentlyContinue

if (-not $isBackend) {
    Start-Process -FilePath "powershell.exe" -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File start_backend.ps1" -WorkingDirectory "$PSScriptRoot\backend" -WindowStyle Hidden
}

if (-not $isFrontend) {
    Start-Process -FilePath "powershell.exe" -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File start_frontend.ps1" -WorkingDirectory "$PSScriptRoot\frontend" -WindowStyle Hidden
    Start-Sleep -Seconds 6
}

Start-Process "http://localhost:5173"
