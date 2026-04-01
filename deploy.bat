@echo off
echo ====================================
echo  Pac-Man Plugin Deploy Script
echo ====================================
echo.

set SOURCE_DIR=G:\projects\ulanzi-plugin\com.ulanzi.pacman.ulanziPlugin
set TARGET_DIR=C:\Users\Kingfisher\AppData\Roaming\Ulanzi\UlanziDeck\Plugins\com.ulanzi.pacman.ulanziPlugin

echo [1/3] Checking target directory...
if exist "%TARGET_DIR%" (
    echo WARNING: Found existing plugin, removing...
    rmdir /s /q "%TARGET_DIR%"
    if errorlevel 1 (
        echo ERROR: Failed to remove old version!
        echo Please close UlanziStudio and try again.
        pause
        exit /b 1
    )
    echo OK: Old version removed
)

echo.
echo [2/3] Copying plugin files...
xcopy "%SOURCE_DIR%" "%TARGET_DIR%\" /E /I /Y /Q
if errorlevel 1 (
    echo ERROR: Copy failed!
    pause
    exit /b 1
)

echo OK: Plugin files copied to:
echo    %TARGET_DIR%

echo.
echo [3/3] Deploy complete!
echo.
echo Next steps:
echo    1. Restart UlanziStudio
echo    2. Find "Pac-Man Runner" in plugin list
echo    3. Drag to 3x5 key grid and enjoy!
echo.
echo ====================================
pause
