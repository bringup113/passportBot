@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo Starting Visa Management System Deployment...

REM Check Docker installation
docker --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Docker not installed, please install Docker first
    pause
    exit /b 1
)

docker-compose --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Docker Compose not installed, please install Docker Compose first
    pause
    exit /b 1
)

REM Check environment file
if not exist .env (
    echo Creating environment file...
    copy env.example .env
    echo.
    echo ⚠️  SECURITY WARNING: JWT_SECRET must be changed to a secure key!
    echo.
    echo To generate a secure JWT secret, run:
    echo   generate-secret.bat
    echo.
    echo Or manually edit .env file and change JWT_SECRET to a secure value.
    echo.
    pause
)

REM Stop existing containers
echo Stopping existing containers...
docker-compose down

REM Build images
echo Building Docker images...
docker-compose build

REM Start services
echo Starting services...
docker-compose up -d

REM Wait for database startup
echo Waiting for database startup...
timeout /t 10 /nobreak >nul

REM Run database migration
echo Running database migration...
docker-compose exec -T server npx prisma migrate deploy

REM Generate Prisma client
echo Generating Prisma client...
docker-compose exec -T server npx prisma generate

REM Fill initial data
echo Filling initial data...
docker-compose exec -T server npm run prisma:seed 2>nul || echo WARNING: Initial data filling failed, please check manually

REM Check service status
echo Checking service status...
docker-compose ps

echo.
echo SUCCESS: Deployment completed!
echo.
echo Access URLs:
echo    - Frontend: http://localhost:80
echo    - Backend API: http://localhost:3000
echo.
echo Common commands:
echo    - View logs: docker-compose logs -f
echo    - Stop services: docker-compose down
echo    - Restart services: docker-compose restart
echo.
echo.
echo ⚠️  SECURITY WARNING: 
echo    - Make sure JWT_SECRET in .env file is changed to a secure key
echo    - Run 'generate-secret.bat' to generate a secure key
echo    - Never commit .env file to version control
echo.
pause
