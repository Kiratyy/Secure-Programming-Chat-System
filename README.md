# Secure-Programming-Chat-System

## Team Members

Our project team consists of the following members:

- **Student ID**: A1868575
- **Student ID**: A1849708
- **Student ID**: A1827281

## Server

```bash
node index.js
```

## Database Setup

To run this project, you need to set up a MySQL database on your local machine. Follow these steps to configure the database and create the necessary user.

### Step 1: Set up MySQL

1. Ensure MySQL is installed and running on your machine. If you don't have it installed, you can download and install it from [MySQL's official website](https://dev.mysql.com/downloads/).

2. Run the provided script `mysql_setup.sh` to automatically create a new database and user. In the terminal, navigate to the project directory and execute the script:

   ```bash
   ./mysql_setup.sh
   ```

3. When prompted, enter the MySQL root password, then provide the following details:

   - **Database name**: The name of the new database (e.g., `secure_database`).
   - **Username**: The new MySQL username (e.g., `secure_user`).
   - **Password**: The password for the new user.

4. Once completed, the script will create the database and grant the new user full access to it.

### Step 2: Configure Environment Variables

To store the database configuration, follow these steps:

1. Run the `env_setup.sh` script to generate the `.env` file:

   ```bash
   ./env_setup.sh
   ```

2. When prompted, enter the following information:

   - **Database host**: Usually `localhost` for local development.
   - **Database username**: The username you created in Step 1 (e.g., `secure_user`).
   - **Database password**: The password you created for the user.
   - **Database name**: The name of the database you created (e.g., `secure_database`).

3. This script will create a `.env` file in the project root directory with your database configuration. The `.env` file will look like this:

   ```plaintext
   DB_HOST=localhost
   DB_USER=secure_user
   DB_PASSWORD=your_password
   DB_NAME=secure_database
   ```

### Step 3: Start the Application

Once the database is configured and the `.env` file is set up, navigate to the `server` directory and start the application:

```bash
cd server
node index.js

```

## Notes

Database configuration steps:

    1.	Log in to MySQL using mysql -u root -p.
    2.	Modify the authentication method for the user secure_user and set a password.
    3.	Refresh the privileges.
    4.	Grant the secure_user user SELECT, INSERT, UPDATE, and DELETE permissions on the secure_database database.
    5.	Log in using secure_user and select the secure_database database.
    6.	Create the table userinputdata and insert data.
