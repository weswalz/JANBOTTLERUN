#!/bin/bash

# Build the application
echo "Building the application..."
npm run build
npm run build-server

# Create deployment directory if it doesn't exist
ssh root@69.28.91.248 'mkdir -p /var/www/bottlerun'

# Deploy the built files
echo "Deploying to server..."
scp -r dist/* root@69.28.91.248:/var/www/bottlerun/
scp -r dist-server/* root@69.28.91.248:/var/www/bottlerun/server/
scp package.json root@69.28.91.248:/var/www/bottlerun/

# Install dependencies and restart the server
echo "Installing dependencies and starting the server..."
ssh root@69.28.91.248 'cd /var/www/bottlerun && \
    npm install --production && \
    pm2 delete bottlerun-osc || true && \
    pm2 start server/server.js --name bottlerun-osc'

echo "Deployment completed!" 