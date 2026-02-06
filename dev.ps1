Write-Host "Starting backend..."
Start-Process powershell -ArgumentList "cd backend; uv run fastapi dev app/main.py"

Write-Host "Starting frontend..."
Start-Process powershell -ArgumentList "cd frontend; npm run dev"