const net = require('net');
const tls = require('tls');

const TARGET_HOST = '3.69.165.120';
const TARGET_PORT = 443;
const PROXY_PORT = process.env.PORT || 443;

console.log('Starting VPN Proxy Server...');
console.log(`Target: ${TARGET_HOST}:${TARGET_PORT}`);
console.log(`Listening on port: ${PROXY_PORT}`);

// Create a raw TCP server that forwards all traffic
const server = net.createServer((clientSocket) => {
  console.log(`New connection from: ${clientSocket.remoteAddress}:${clientSocket.remotePort}`);
  
  // Create connection to Frankfurt server
  const serverSocket = new net.Socket();
  
  serverSocket.connect(TARGET_PORT, TARGET_HOST, () => {
    console.log('Connected to Frankfurt server');
    
    // Start forwarding data in both directions
    clientSocket.pipe(serverSocket, { end: false });
    serverSocket.pipe(clientSocket, { end: false });
    
    // Handle client socket events
    clientSocket.on('close', () => {
      console.log('Client disconnected');
      serverSocket.destroy();
    });
    
    clientSocket.on('error', (err) => {
      console.error('Client error:', err.message);
      serverSocket.destroy();
    });
    
    // Handle server socket events
    serverSocket.on('close', () => {
      console.log('Server disconnected');
      clientSocket.destroy();
    });
    
    serverSocket.on('error', (err) => {
      console.error('Server error:', err.message);
      clientSocket.destroy();
    });
  });
  
  // Handle connection errors
  serverSocket.on('error', (err) => {
    console.error('Failed to connect to Frankfurt server:', err.message);
    clientSocket.destroy();
  });
});

// Start the server
server.listen(PROXY_PORT, '0.0.0.0', () => {
  console.log(`VPN Proxy Server listening on port ${PROXY_PORT}`);
  console.log('Ready to forward VLESS/REALITY traffic');
});

// Handle server errors
server.on('error', (err) => {
  console.error('Server error:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('Shutting down...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
