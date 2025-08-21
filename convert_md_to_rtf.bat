@echo off
echo ===============================================
echo Markdown to RTF Converter
echo ===============================================
echo.

:: Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python from: https://www.python.org/downloads/
    pause
    exit /b 1
)

:: Check if pandoc is installed
pandoc --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Pandoc is not installed or not in PATH
    echo.
    echo Please install Pandoc from: https://pandoc.org/installing.html
    echo.
    echo For Windows, you can:
    echo 1. Download the installer from the website above, OR
    echo 2. Use Chocolatey: choco install pandoc, OR
    echo 3. Use Scoop: scoop install pandoc
    echo.
    pause
    exit /b 1
)

:: Run the Python conversion script
echo Running conversion script...
echo.
python convert_md_to_rtf.py

echo.
echo ===============================================
echo Conversion completed!
echo ===============================================
pause