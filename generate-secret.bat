@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo ========================================
echo 生成安全的 JWT 密钥
echo ========================================
echo.

REM 检查 Node.js 是否安装
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js 未安装，无法生成密钥
    echo.
    echo 请手动生成安全的 JWT 密钥：
    echo 1. 访问：https://generate-secret.vercel.app/32
    echo 2. 复制生成的密钥
    echo 3. 替换 .env 文件中的 JWT_SECRET
    echo.
    pause
    exit /b 1
)

echo 🔐 正在生成安全的 JWT 密钥...
echo.

REM 生成密钥
for /f "tokens=*" %%i in ('node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"') do set SECRET=%%i

echo ✅ 生成的 JWT 密钥：
echo.
echo %SECRET%
echo.
echo 📝 请将此密钥复制到 .env 文件中的 JWT_SECRET 字段
echo.

REM 检查 .env 文件是否存在
if exist .env (
    echo 🔍 检测到 .env 文件，是否要自动更新？(Y/N)
    set /p choice=
    if /i "!choice!"=="Y" (
        echo.
        echo 📝 正在更新 .env 文件...
        
        REM 创建临时文件
        set tempfile=%random%.tmp
        
        REM 读取 .env 文件并替换 JWT_SECRET
        for /f "tokens=*" %%a in (.env) do (
            set line=%%a
            setlocal enabledelayedexpansion
            if "!line:~0,11!"=="JWT_SECRET=" (
                echo JWT_SECRET=%SECRET%>>!tempfile!
            ) else (
                echo !line!>>!tempfile!
            )
            endlocal
        )
        
        REM 替换原文件
        move /y !tempfile! .env >nul
        
        echo ✅ .env 文件已更新！
        echo.
        echo ⚠️  重要提醒：
        echo - 请确保 .env 文件不会被提交到版本控制系统
        echo - 在生产环境中，请使用更安全的密钥管理方式
        echo.
    ) else (
        echo.
        echo ℹ️  请手动将密钥复制到 .env 文件中
        echo.
    )
) else (
    echo ℹ️  未检测到 .env 文件，请先运行部署脚本创建 .env 文件
    echo.
)

echo 按任意键继续...
pause >nul
