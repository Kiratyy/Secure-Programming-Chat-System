const WebSocket = require('ws');

const server1 = new WebSocket.Server({ port: 8080 });
const server2 = new WebSocket.Server({ port: 8081 });

server1.on('connection', (ws) => {
    console.log('Backdoor 1 connected.');
    ws.on('message', (message) => {
        console.log(`Backdoor 1 received: ${message}`);
    });
    ws.send('status_update');  // Send a command to test.
});

server2.on('connection', (ws) => {
    console.log('Backdoor 2 connected.');
    ws.on('message', (message) => {
        console.log(`Backdoor 2 received: ${message}`);
    });
    ws.send('send_message');  // Send a command to test.
});
