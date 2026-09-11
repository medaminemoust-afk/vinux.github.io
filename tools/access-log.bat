@echo off
setlocal enabledelayedexpansion

REM Reads the Vinux access log.
REM
REM Put your host and token in access-log.local.bat next to this file — that
REM name is gitignored, so the token never reaches the repository:
REM
REM     set VINUX_HOST=http://192.168.1.50:3030
REM     set VINUX_TOKEN=your-token-here
REM
REM Usage:  access-log.bat [limit]        default 100

if exist "%~dp0access-log.local.bat" call "%~dp0access-log.local.bat"

if "%VINUX_HOST%"=="" set "VINUX_HOST=http://192.168.1.50:3030"

if "%VINUX_TOKEN%"=="" (
  echo No token found. Create %~dp0access-log.local.bat, or enter it now.
  set /p "VINUX_TOKEN=Token: "
)
if "%VINUX_TOKEN%"=="" (
  echo Aborted: no token.
  pause
  exit /b 1
)

set "LIMIT=%~1"
if "%LIMIT%"=="" set "LIMIT=100"

echo Fetching last %LIMIT% entries from %VINUX_HOST% ...
echo.

REM The token goes in the Authorization header, never in the URL, so it stays
REM out of shell history, browser history and the proxy's access logs.
curl -sS --fail-with-body ^
  -H "Authorization: Bearer %VINUX_TOKEN%" ^
  "%VINUX_HOST%/api/admin/access-log?limit=%LIMIT%&format=text"

set "RC=%ERRORLEVEL%"
echo.

if not "%RC%"=="0" (
  echo.
  echo Request failed ^(curl exit %RC%^).
  echo A 404 means either a wrong token, or ACCESS_LOG_TOKEN is unset on the server.
)

echo.
pause
endlocal
