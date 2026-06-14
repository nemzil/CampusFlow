# CampusFlow Server Launcher (Inline Terminal Mode)
$Host.UI.RawUI.WindowTitle = "CampusFlow Launcher (Inline)"

Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "         CampusFlow Server Launcher (Inline)" -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host ""

$jobs = @()

try {
    Write-Host "[1] Starting Backend (FastAPI + Python venv)..." -ForegroundColor Yellow
    # Start Backend as a background job
    $backendJob = Start-Job -Name "CampusFlow_Backend" -ScriptBlock {
        cd $using:PSScriptRoot
        cd backend
        Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process -Force
        .\venv\Scripts\Activate.ps1
        python -m uvicorn app.main:app --reload
    }
    $jobs += $backendJob

    Write-Host "[2] Starting Frontend (Next.js)..." -ForegroundColor Yellow
    # Start Frontend as a background job
    $frontendJob = Start-Job -Name "CampusFlow_Frontend" -ScriptBlock {
        cd $using:PSScriptRoot
        cd frontend
        npm run dev
    }
    $jobs += $frontendJob

    Write-Host ""
    Write-Host "===================================================" -ForegroundColor Green
    Write-Host "Both servers are running in the background." -ForegroundColor Green
    Write-Host "Live logs will stream below." -ForegroundColor Green
    Write-Host "Press Ctrl+C to stop both servers and exit." -ForegroundColor Yellow
    Write-Host "===================================================" -ForegroundColor Green
    Write-Host ""

    # Tail logs from the background jobs
    while ($true) {
        $jobs | Receive-Job
        Start-Sleep -Milliseconds 500
    }
}
finally {
    Write-Host "`n===================================================" -ForegroundColor Red
    Write-Host "Stopping servers and cleaning up background processes..." -ForegroundColor Red
    Write-Host "===================================================" -ForegroundColor Red
    
    foreach ($job in $jobs) {
        Write-Host "Stopping job: $($job.Name)..." -ForegroundColor Gray
        Stop-Job $job -ErrorAction SilentlyContinue
        Remove-Job $job -ErrorAction SilentlyContinue
    }
    
    # Also clean up uvicorn and node subprocesses to ensure no port remains bound
    Get-Process -Name "python" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*uvicorn*" } | Stop-Process -Force -ErrorAction SilentlyContinue
    Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*npm run dev*" -or $_.CommandLine -like "*next-dev*" } | Stop-Process -Force -ErrorAction SilentlyContinue
    
    Write-Host "Shutdown complete. Goodbye!" -ForegroundColor Green
}
