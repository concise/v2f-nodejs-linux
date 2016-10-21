const assert = require('assert');
const fs = require('fs');

const uhidEventLoopFactory = function (outputReportProcessor) {

    // outputReportProcessor is a function that
    // processes an HID output report and then
    // returns an Array of zero or more HID input reports

    const fd = fs.openSync('/dev/uhid', fs.constants.O_RDWR);

    {
        const EV_CREATE2 = Buffer.from(
            '0b00000000000000000000000000000000000000000000000000000000000000' +
            '0000000000000000000000000000000000000000000000000000000000000000' +
            '0000000000000000000000000000000000000000000000000000000000000000' +
            '0000000000000000000000000000000000000000000000000000000000000000' +
            '0000000000000000000000000000000000000000000000000000000000000000' +
            '0000000000000000000000000000000000000000000000000000000000000000' +
            '0000000000000000000000000000000000000000000000000000000000000000' +
            '0000000000000000000000000000000000000000000000000000000000000000' +
            '00000000220000000000000000000000000000000000000006d0f10901a10109' +
            '20150026ff007508954081020921150026ff00750895409102c0', 'hex');

        const n = fs.writeSync(fd, EV_CREATE2, 0, EV_CREATE2.length, null);

        assert(n === EV_CREATE2.length);
    }

    const loop = function () {
        fs.read(fd, Buffer.alloc(4380), 0, 4380, null, cb);
    };

    const cb = function (err, bytesRead, buffer) {
        assert(!err && bytesRead === 4380);
        if (buffer.readUInt32LE(0) === 6) {
            processOutputEventFromKernel(buffer);
        }
        loop();
    };

    const processOutputEventFromKernel = function (EV_OUTPUT) {
        const size = EV_OUTPUT.readUInt16LE(4 + 4096);
        const outputReport = EV_OUTPUT.slice(4 + 1, 4 + size);
        const inputReports = outputReportProcessor(outputReport);
        for (let inputReport of inputReports) {
            sendInputReportToKernel(inputReport);
        }
    };

    const sendInputReportToKernel = function (inputReport) {
        const header = Buffer.from([0x0c, 0x00, 0x00, 0x00,
                                    inputReport.length & 0xff,
                                    inputReport.length >> 8 & 0xff]);
        const EV_INPUT2 = Buffer.concat([header, inputReport]);
        const n = fs.writeSync(fd, EV_INPUT2, 0, EV_INPUT2.length, null);
        assert(n === EV_INPUT2.length);
    };

    return loop;
};

module.exports = uhidEventLoopFactory;
