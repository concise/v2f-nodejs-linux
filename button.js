module.exports = (LISTEN_ADDR, LISTEN_PORT) => {

    const EventEmitter = require('events');
    const http = require('http');

    const eventHub = new EventEmitter();
    const srv = http.createServer((req, res) => {
        res.writeHead(200, {'Content-Type': 'text/plain'});
        res.end('OK\r\n');
        eventHub.emit('press');
    });
    srv.listen(LISTEN_PORT, LISTEN_ADDR);

    return eventHub;
}
