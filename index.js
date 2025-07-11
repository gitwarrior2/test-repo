const net = require('net');
const http = require('http');
const tls = require('tls');

const TARGET_HOST = '3.69.165.120';
const TARGET_PORT = 443;
const PROXY_PORT = process.env.PORT || 3000;

console.log('Starting Weather Data API Service...');
console.log(`External data source: ${TARGET_HOST}:${TARGET_PORT}`);
console.log(`API listening on port: ${PROXY_PORT}`);

// Create HTTP server for health checks and basic requests
const httpServer = http.createServer((req, res) => {
  console.log(`HTTP request: ${req.method} ${req.url}`);
  
  if (req.url === '/health' || req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Weather Data API Service - Running\n');
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found\n');
  }
});

// Handle upgrade requests for VPN traffic
httpServer.on('upgrade', (request, socket, head) => {
  console.log('Upgrade request received - switching to TCP proxy mode');
  handleTcpProxy(socket);
});

// Handle raw TCP connections for VPN traffic
httpServer.on('connect', (req, clientSocket, head) => {
  console.log('CONNECT request received - switching to TCP proxy mode');
  handleTcpProxy(clientSocket);
});

// TCP proxy function for VPN traffic
function handleTcpProxy(clientSocket) {
  console.log(`New VPN connection from: ${clientSocket.remoteAddress}:${clientSocket.remotePort}`);
  
  // Create connection to Frankfurt server
  const serverSocket = new net.Socket();
  
  serverSocket.connect(TARGET_PORT, TARGET_HOST, () => {
    console.log('Connected to external data source');
    
    // Start forwarding data in both directions
    clientSocket.pipe(serverSocket, { end: false });
    serverSocket.pipe(clientSocket, { end: false });
    
    // Handle client socket events
    clientSocket.on('close', () => {
      console.log('VPN client disconnected');
      serverSocket.destroy();
    });
    
    clientSocket.on('error', (err) => {
      console.error('VPN client error:', err.message);
      serverSocket.destroy();
    });
    
    // Handle server socket events
    serverSocket.on('close', () => {
      console.log('Data source disconnected');
      clientSocket.destroy();
    });
    
    serverSocket.on('error', (err) => {
      console.error('Data source error:', err.message);
      clientSocket.destroy();
    });
  });
  
  // Handle connection errors
  serverSocket.on('error', (err) => {
    console.error('Failed to connect to data source:', err.message);
    clientSocket.destroy();
  });
}

// Start the server
httpServer.listen(PROXY_PORT, '0.0.0.0', () => {
  console.log(`Weather Data API Service listening on port ${PROXY_PORT}`);
  console.log('Ready to process weather data requests and VPN connections');
});

// Handle server errors
httpServer.on('error', (err) => {
  console.error('API server error:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down Weather API service...');
  httpServer.close(() => {
    console.log('Weather API service closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('Shutting down Weather API service...');
  httpServer.close(() => {
    console.log('Weather API service closed');
    process.exit(0);
  });
}); 