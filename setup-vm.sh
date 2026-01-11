#!/bin/bash

# Configuration
REPO_URL="https://github.com/Mahmoudalmardini/After-Sales-Management.git"
INSTALL_DIR="/opt/after-sales-system"
APP_NAME="after-sales"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Starting Deployment for $APP_NAME...${NC}"

# Check for Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed. Please install Docker first.${NC}"
    exit 1
fi

# Stop existing containers
echo -e "${YELLOW}🛑 Stopping existing containers...${NC}"
cd $INSTALL_DIR 2>/dev/null
if [ $? -eq 0 ]; then
    sudo docker compose down --remove-orphans
else
    echo -e "${YELLOW}⚠️  No previous installation found in $INSTALL_DIR${NC}"
fi

# Clean installation directory
echo -e "${YELLOW}🧹 Cleaning installation directory...${NC}"
sudo rm -rf $INSTALL_DIR
sudo mkdir -p $INSTALL_DIR
sudo chown -R $USER:$USER $INSTALL_DIR

# Clone Repository
echo -e "${GREEN}📥 Cloning repository...${NC}"
git clone $REPO_URL $INSTALL_DIR

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to clone repository.${NC}"
    exit 1
fi

cd $INSTALL_DIR

# Create simplified .env file (if needed, though docker-compose handles most vars)
# Adjust these secrets for actual production use!
echo -e "${GREEN}⚙️  Configuring environment...${NC}"
# Note: In a real CI/CD, these would come from secrets. For now, we use defaults or ask user.

# Launch Docker Compose
echo -e "${GREEN}🐳 Building and starting containers...${NC}"
sudo docker compose up -d --build

# Verify
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Deployment successful!${NC}"
    echo -e "${GREEN}👉 Backend logs:${NC}"
    sudo docker compose logs -f backend
else
    echo -e "${RED}❌ Deployment failed.${NC}"
    exit 1
fi
