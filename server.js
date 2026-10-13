const http = require('http');
const fs = require('fs');
const path = require('path');
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };
http.createServer((req, res) => {
  const file = path.join(__dirname, req.url === '/' ? 'index.html' : decodeURIComponent(req.url));
  fs.readFile(file, (error, body) => {
    if (error) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' }); res.end(body);
  });
}).listen(4173, () => console.log('Preview: http://localhost:4173'));
