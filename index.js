const net = require('net');
const tls = require('tls');

const TARGET_HOST = '3.69.165.120';
const TARGET_PORT = 443;
const PROXY_PORT = process.env.PORT || 443;

// Create TCP proxy server
const server = net.createServer((clientSocket) => {
  console.log('Client connected:', clientSocket.remoteAddress);
  
  // Connect to Frankfurt server
  const serverSocket = tls.connect({
    host: TARGET_HOST,
    port: TARGET_PORT,
    servername: 'www.googleapis.com', // SNI for REALITY
    rejectUnauthorized: false // Allow self-signed certs
  }, () => {
    console.log('Connected to Frankfurt server');
    
    // Pipe data between client and server
    clientSocket.pipe(serverSocket);
    serverSocket.pipe(clientSocket);
  });
  
  // Handle errors
  serverSocket.on('error', (err) => {
    console.error('Server socket error:', err);
    clientSocket.destroy();
  });
  
  clientSocket.on('error', (err) => {
    console.error('Client socket error:', err);
    serverSocket.destroy();
  });
  
  // Handle disconnections
  clientSocket.on('close', () => {
    console.log('Client disconnected');
    serverSocket.destroy();
  });
  
  serverSocket.on('close', () => {
    console.log('Server disconnected');
    clientSocket.destroy();
  });
});

// Start the proxy server
server.listen(PROXY_PORT, '0.0.0.0', () => {
  console.log(`TCP Proxy listening on port ${PROXY_PORT}`);
  console.log(`Forwarding to ${TARGET_HOST}:${TARGET_PORT}`);
});

// Handle server errors
server.on('error', (err) => {
  console.error('Proxy server error:', err);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down proxy server...');
  server.close(() => {
    console.log('Proxy server closed');
    process.exit(0);
  });
}); 