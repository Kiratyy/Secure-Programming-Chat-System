# Secure Chat Application

## Team Members

- Alex Mathew(a1849708)
- Gunkirat Singh(a1827281)
- Jiazhi Chen(a1868575)

## Team Member Contributions

- **Alex**

  - Implemented the backdoor and the vulnerable version of the project.
  - Developed the direct messaging feature.

- **Jiazhi**

  - Maintained the overall project.
  - Designed and implemented the protocol.
  - Finalized the implementation of the project.
  - Developed the login and registration pages.
  - Implemented the security measures.

- **Gunkirat**
  - Researched protocol options and decided on the final protocol.
  - Contributed to the UI/UX design.
  - Set up the project's database.

## Project Description

This is a secure chat application that supports both group and private messaging.

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/Kiratyy/Secure-Programming-Chat-System/tree/main
   ```
2. Install dependencies:
   ```
   npm install
   ```
3. Set up the database:
   ```
   ./mysql_setup.sh
   ```

## Running the Application

1. Start the server:
   ```
   node server/index.js
   ```
2. Open a web browser and navigate to `http://localhost:3000`

## Dependencies

- Node.js (v14.0.0 or higher)
- MySQL (v8.0 or higher)
- Express.js (v4.21.1)
- WebSocket (v8.18.0)
- bcrypt (v5.1.1)
- body-parser (v1.20.3)
- dotenv (v16.4.5)
- express-session (v1.18.1)
- helmet (v4.6.0)
- mysql2 (v3.11.3)
- node-fetch (v3.3.2)
- xss (v1.0.14)

## Chat History Setup

For privacy and security reasons, actual chat history files are not included in this repository. To set up the chat history:

1. Navigate to the `server` directory.
2. Copy `groupChatHistory.example.json` to `groupChatHistory.json`.
3. Copy `privateChatHistory.example.json` to `privateChatHistory.json`.

These files will be used to store chat history locally and will not be uploaded to the repository.

## Security Measures and Known Issues

This project implements several security measures to protect against common web vulnerabilities:

- SQL Injection protection through the use of parameterized queries.
- Password hashing using bcrypt.
- HTTPS support (when properly configured in production).
- XSS protection measures (though some potential vulnerabilities may still exist).
- CSRF protection through the use of express-session and secure cookie settings.

However, it's important to note that while we've implemented various security measures, there may still be potential vulnerabilities, particularly with regards to XSS attacks.

## Security Testing

To test the security of the application, we've included a `security_tests.js` file. This file contains tests for XSS and SQL injection vulnerabilities. To run these tests:

1. Ensure the server is running.
2. Open a new terminal window.
3. Navigate to the project directory.
4. Run the following command:
   ```
   node security_tests.js
   ```

This will run a series of tests and output the results, indicating any potential vulnerabilities detected.

Please note that passing these tests does not guarantee the absence of all security vulnerabilities.

## Known Issues

- File transfer is limited to images and small documents only.
- User status updates may be delayed in some cases.
- The first file transfer might be slower than subsequent transfers.
- Chat history for files is not preserved when logging out or refreshing the page.
- On the registration page, the icon positions do not adjust correctly when the input fields move due to validation messages.

## Vulnerable vs Non-Vulnerable Versions

This repository contains both vulnerable and non-vulnerable versions of the code:

- The `main` branch contains the secure, non-vulnerable version.
- The `Chat-Bubble` branch contains a version with intentional security flaws for educational purposes.

Please use the non-vulnerable version for any real-world applications.
