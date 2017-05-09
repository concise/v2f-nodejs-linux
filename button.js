const BUTTON_ADDR = '127.0.0.1';
const BUTTON_PORT = 7890;

const EventEmitter = require('events');
const http = require('http');

const ee = new EventEmitter();

http.createServer((req, res) => {
    res.writeHead(200, {'Content-Type': 'text/plain'});
    res.end('OK\r\n');
    ee.emit('press');
}).listen(BUTTON_PORT, BUTTON_ADDR);

const getUserApprovalBit = (userApprovalCallback) => {
    console.log();
    console.log('To approve the U2F request please GET the URL:');
    console.log();
    console.log(`    http://${BUTTON_ADDR}:${BUTTON_PORT}/`);
    console.log();
    const waitButtonPress = new Promise( (f,r) => ee.once('press', f)  );
    const waitTenSeconds  = new Promise( (f,r) => setTimeout(r, 10000) );
    Promise.race([waitButtonPress, waitTenSeconds])
        .then(()=>{
            userApprovalCallback(true);
        })
        .catch(()=>{
            userApprovalCallback(false);
        });
};

module.exports = getUserApprovalBit;
