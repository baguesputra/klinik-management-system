#!/bin/sh
echo "Running database migrations..."
npx prisma migrate deploy
echo "Starting server..."
node server.js