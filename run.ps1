# Start FDE Trainer on Windows (PowerShell).
# - First run: creates .venv and installs packages.
# - When requirements.txt changes (after a git pull), packages are installed again automatically.
# - The browser opens only when the server answers, so the first page always loads.
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

$Python = ".\.venv\Scripts\python.exe"
$Stamp = ".venv\requirements.sha256"
$Url = "http://127.0.0.1:8765"

if (-not (Test-Path $Python)) {
    Write-Host "Creating virtual environment..."
    python -m venv .venv
}

$want = (Get-FileHash requirements.txt -Algorithm SHA256).Hash
$have = if (Test-Path $Stamp) { (Get-Content $Stamp -Raw).Trim() } else { "" }
if ($want -ne $have) {
    Write-Host "Installing packages (requirements.txt changed or first run)..."
    & $Python -m pip install --upgrade pip --quiet
    & $Python -m pip install -r requirements.txt
    if ($LASTEXITCODE -ne 0) { throw "pip install failed. Fix the error above and run start.cmd again." }
    Set-Content -Path $Stamp -Value $want   # written only after a successful install
}

if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host "Created .env - open it and add your ANTHROPIC_API_KEY for the AI features."
}

# Open the browser in the background as soon as /api/health answers (max 60 s).
Start-Job -ArgumentList $Url -ScriptBlock {
    param($u)
    for ($i = 0; $i -lt 120; $i++) {
        try {
            Invoke-WebRequest -UseBasicParsing -TimeoutSec 1 "$u/api/health" | Out-Null
            Start-Process $u
            return
        } catch { Start-Sleep -Milliseconds 500 }
    }
} | Out-Null

Write-Host "Starting FDE Trainer at $Url  (close this window or press Ctrl+C to stop)"
& $Python -m uvicorn server.app:app --host 127.0.0.1 --port 8765
