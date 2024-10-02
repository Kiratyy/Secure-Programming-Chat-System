#!/bin/bash

echo "Starting MySQL setup..."

# Prompt for MySQL root password
read -sp "Enter MySQL root password: " root_password
echo

# Prompt for new database details
read -p "Enter new database name: " db_name
read -p "Enter new MySQL username: " db_user
read -sp "Enter new MySQL user password: " db_password
echo

# Execute MySQL commands to create database, user, and grant privileges
mysql -u root -p$root_password <<MYSQL_SCRIPT
CREATE DATABASE $db_name;
CREATE USER '$db_user'@'localhost' IDENTIFIED BY '$db_password';
GRANT ALL PRIVILEGES ON $db_name.* TO '$db_user'@'localhost';
FLUSH PRIVILEGES;
MYSQL_SCRIPT

echo "MySQL setup completed. Database '$db_name' and user '$db_user' have been created."
