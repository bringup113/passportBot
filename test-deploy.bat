@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo Testing deployment configuration...

REM Check if Docker is running
docker info >nul 2>&1
if errorlevel 1 (
    echo ERROR: Docker not running, please start Docker
    pause
    exit /b 1
)

REM Check environment file
if not exist .env (
    echo Creating environment file...
    copy env.example .env
    echo WARNING: Please edit .env file, especially JWT_SECRET
)

REM Stop existing containers
echo Stopping existing containers...
docker-compose down

REM Clean old images
echo Cleaning old images...
docker system prune -f

REM Build images
echo Building Docker images...
docker-compose build --no-cache

REM Start services
echo Starting services...
docker-compose up -d

REM Wait for service startup
echo Waiting for service startup...
timeout /t 15 /nobreak >nul

REM Check service status
echo Checking service status...
docker-compose ps

REM Check container logs
echo Checking container logs...
echo === Database logs ===
docker-compose logs db --tail=10

echo === Backend logs ===
docker-compose logs server --tail=10

echo === Frontend logs ===
docker-compose logs web --tail=10

REM Test health checks
echo Testing health checks...
echo Database health check:
docker-compose exec -T db pg_isready -U postgres

echo Backend health check:
curl -f http://localhost:3000/health 2>nul || echo Backend health check failed

echo Frontend health check:
curl -f http://localhost:80/health 2>nul || echo Frontend health check failed

echo.
echo SUCCESS: Test completed!
echo.
echo Access URLs:
echo    - Frontend: http://localhost:80
echo    - Backend API: http://localhost:3000
echo.
echo View logs:
echo    docker-compose logs -f
echo.
echo Stop services:
echo    docker-compose down
pause
