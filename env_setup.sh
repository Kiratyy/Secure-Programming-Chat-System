#!/bin/bash

echo "Starting automated setup..."

# Prompt user for database information
read -p "Enter database host (default: localhost): " db_host
db_host=${db_host:-localhost}

read -p "Enter database username: " db_user
read -sp "Enter database password: " db_password
echo
read -p "Enter database name: " db_name

# Generate .env file
echo "DB_HOST=$db_host" > .env
echo "DB_USER=$db_user" >> .env
echo "DB_PASSWORD=$db_password" >> .env
echo "DB_NAME=$db_name" >> .env

echo ".env file has been created."
