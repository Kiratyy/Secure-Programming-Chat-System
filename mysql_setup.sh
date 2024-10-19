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
CREATE DATABASE IF NOT EXISTS $db_name;
CREATE USER IF NOT EXISTS '$db_user'@'localhost' IDENTIFIED BY '$db_password';
GRANT ALL PRIVILEGES ON $db_name.* TO '$db_user'@'localhost';
FLUSH PRIVILEGES;

USE $db_name;

CREATE TABLE IF NOT EXISTS userinputdata (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL
);
MYSQL_SCRIPT

if [ $? -eq 0 ]; then
    echo "MySQL setup completed successfully. Database '$db_name' and user '$db_user' have been created with appropriate privileges."
else
    echo "An error occurred during MySQL setup. Please check your root password and try again."
    exit 1
fi

# Update .env file
echo "Updating .env file..."
cat > .env <<EOF
DB_HOST=localhost
DB_USER=$db_user
DB_PASSWORD=$db_password
DB_NAME=$db_name
EOF

echo ".env file has been updated with the new database configuration."