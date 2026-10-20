@echo off
title House Clipper - Inicializador
cd /d "%~dp0"
echo ====================================================
echo        Iniciando House Clipper v1.1.0...
echo ====================================================
echo.

python main.py
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Ocorreu um erro ao iniciar o House Clipper.
    pause
)
