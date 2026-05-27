@echo off
setlocal EnableDelayedExpansion

set ROOT=E:\nota_lawyer_hackathon\nota-build

for /f "tokens=1,* delims==" %%a in (%ROOT%\nota-lex\.env.local) do (
    if "%%a"=="NEXT_PUBLIC_SUPABASE_URL"      set "NEXT_PUBLIC_SUPABASE_URL=%%b"
    if "%%a"=="SUPABASE_SERVICE_ROLE_KEY"     set "SUPABASE_SERVICE_ROLE_KEY=%%b"
    if "%%a"=="NEXT_PUBLIC_SUPABASE_ANON_KEY" set "NEXT_PUBLIC_SUPABASE_ANON_KEY=%%b"
    if "%%a"=="OLLAMA_EMBED_URL"              set "OLLAMA_EMBED_URL=%%b"
    if "%%a"=="OLLAMA_EMBED_MODEL"            set "OLLAMA_EMBED_MODEL=%%b"
    if "%%a"=="OLLAMA_BASE_URL"               set "OLLAMA_BASE_URL=%%b"
    if "%%a"=="OLLAMA_MODEL"                  set "OLLAMA_MODEL=%%b"
    if "%%a"=="GROQ_API_KEY"                  set "GROQ_API_KEY=%%b"
    if "%%a"=="GROQ_MODEL"                    set "GROQ_MODEL=%%b"
    if "%%a"=="LLM_PROVIDER"                  set "LLM_PROVIDER=%%b"
    if "%%a"=="COURTLISTENER_API_TOKEN"       set "COURTLISTENER_API_TOKEN=%%b"
    if "%%a"=="NY_SENATE_API_KEY"             set "NY_SENATE_API_KEY=%%b"
    if "%%a"=="BRIGHT_DATA_API_TOKEN"         set "BRIGHT_DATA_API_TOKEN=%%b"
    if "%%a"=="BRIGHT_DATA_WEB_UNLOCKER_ZONE" set "BRIGHT_DATA_WEB_UNLOCKER_ZONE=%%b"
    if "%%a"=="BRIGHT_DATA_SERP_ZONE"         set "BRIGHT_DATA_SERP_ZONE=%%b"
    if "%%a"=="WEB_DATA_PROVIDER"             set "WEB_DATA_PROVIDER=%%b"
)

set SCRIPT=%~1
shift
REM Rebuild remaining args
set "ARGS="
:loop
if "%~1"=="" goto :run
set "ARGS=!ARGS! %~1"
shift
goto :loop

:run
cd /d %ROOT%\nota-shared
echo === Running %SCRIPT% %ARGS% ===
%ROOT%\node_modules\.bin\tsx.cmd %ROOT%\nota-shared\%SCRIPT% %ARGS%
set EXIT=%ERRORLEVEL%
echo === Done (exit %EXIT%) ===
exit /b %EXIT%
