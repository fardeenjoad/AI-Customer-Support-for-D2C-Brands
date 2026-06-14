@echo off
start "Backend" cmd /k "cd /d "C:\Python Projects\AI Customer Support for D2C Brands\backend" && .venv\Scripts\python.exe -m uvicorn app.main:app --port 8000 --reload"
start "Frontend" cmd /k "cd /d "C:\Python Projects\AI Customer Support for D2C Brands\frontend" && set NEXT_TELEMETRY_DISABLED=1 && npm run dev"
echo Both servers starting...
