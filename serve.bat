@echo off
setlocal
cd /d "%~dp0"

echo.
echo  FaberLoom mockup - servidor local
echo  ==================================
echo.

where python >nul 2>nul
if %ERRORLEVEL%==0 (
    echo  Iniciando en http://localhost:8000
    echo  Abriendo navegador...
    echo  Ctrl+C para detener.
    echo.
    start "" http://localhost:8000/index.html
    python -m http.server 8000
    goto :eof
)

where py >nul 2>nul
if %ERRORLEVEL%==0 (
    echo  Iniciando en http://localhost:8000
    echo  Abriendo navegador...
    echo  Ctrl+C para detener.
    echo.
    start "" http://localhost:8000/index.html
    py -m http.server 8000
    goto :eof
)

where node >nul 2>nul
if %ERRORLEVEL%==0 (
    echo  Iniciando con npx http-server en http://localhost:8000
    echo  Abriendo navegador...
    echo  Ctrl+C para detener.
    echo.
    start "" http://localhost:8000/index.html
    npx --yes http-server -p 8000 -c-1
    goto :eof
)

echo  ERROR: No se encontro Python ni Node en tu sistema.
echo.
echo  Instala cualquiera de los dos:
echo    - Python:  https://www.python.org/downloads/
echo    - Node:    https://nodejs.org/
echo.
pause
