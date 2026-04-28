#!/bin/bash
set -e

SERVER_IP="161.118.191.3"
SSH_USER="ubuntu"
SSH_KEY="./server/ssh-key-2026-04-03.key"
APP_DIR="/home/ubuntu/findwallet"

echo "==> Copying project files to server..."
rsync -avz --exclude 'node_modules' \
  --exclude '.git' \
  --exclude 'server' \
  --exclude 'output.txt' \
  -e "ssh -i $SSH_KEY -o StrictHostKeyChecking=no" \
  . $SSH_USER@$SERVER_IP:$APP_DIR

echo "==> Copying .env to server..."
scp -i $SSH_KEY -o StrictHostKeyChecking=no \
  .env $SSH_USER@$SERVER_IP:$APP_DIR/.env

echo "==> Running setup on server..."
ssh -i $SSH_KEY -o StrictHostKeyChecking=no $SSH_USER@$SERVER_IP << 'ENDSSH'
  # Install Docker if not installed
  if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    curl -fsSL https://get.docker.com | sh
    sudo usermod -aG docker ubuntu
    echo "Docker installed. Re-login may be needed."
  else
    echo "Docker already installed: $(docker --version)"
  fi

  # Install Docker Compose plugin if not installed
  if ! docker compose version &> /dev/null; then
    echo "Installing Docker Compose plugin..."
    sudo apt-get update -y
    sudo apt-get install -y docker-compose-plugin
  else
    echo "Docker Compose already installed: $(docker compose version)"
  fi

  # Create output.txt if it doesn't exist
  touch /home/ubuntu/findwallet/output.txt

  # Build and start
  cd /home/ubuntu/findwallet
  sudo docker compose down || true
  sudo docker compose up -d --build

  echo "==> Done! Container status:"
  sudo docker compose ps
ENDSSH

echo ""
echo "Deploy complete! App is running on the server."
echo "To view logs: ssh -i $SSH_KEY $SSH_USER@$SERVER_IP 'cd $APP_DIR && sudo docker compose logs -f'"
