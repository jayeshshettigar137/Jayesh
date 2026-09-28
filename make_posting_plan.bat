@echo off
REM Double-click to rebuild the posting plan from your recordings.
REM Change RECORDINGS if your folder moves.
set RECORDINGS=J:\chess clips
cd /d "%~dp0"
python -m tracker clips --folder "%RECORDINGS%" --log-games
if errorlevel 1 (
  echo.
  echo Something went wrong. Is Python installed? https://www.python.org/downloads/
)
echo.
echo Open "%RECORDINGS%\_posting_plan" to see today's posts.
pause
