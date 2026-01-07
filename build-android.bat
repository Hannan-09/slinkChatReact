@echo off
echo ========================================
echo   SlinkChat - Android APK Build Script
echo ========================================
echo.

echo [1/5] Patching Java version...
call npm run patch-java
if %errorlevel% neq 0 (
    echo ERROR: Java patch failed!
    pause
    exit /b 1
)
echo ✓ Java patch complete
echo.

echo [2/5] Building web assets...
call npm run build
if %errorlevel% neq 0 (
    echo ERROR: Web build failed!
    pause
    exit /b 1
)
echo ✓ Web build complete
echo.

echo [3/5] Syncing Capacitor...
call npx cap sync android
if %errorlevel% neq 0 (
    echo ERROR: Capacitor sync failed!
    pause
    exit /b 1
)
echo ✓ Capacitor sync complete
echo.

echo [4/5] Cleaning previous builds...
cd android
call gradlew clean
cd ..
echo ✓ Clean complete
echo.

echo [5/5] Building APK...
cd android
call gradlew assembleDebug
if %errorlevel% neq 0 (
    echo ERROR: APK build failed!
    cd ..
    pause
    exit /b 1
)
cd ..
echo ✓ APK build complete
echo.

echo ========================================
echo   BUILD SUCCESSFUL!
echo ========================================
echo.
echo APK Location:
echo android\app\build\outputs\apk\debug\app-debug.apk
echo.
pause
