const assert = require('assert');
const crypto = require('crypto');

const U2FHID_PING  = 0x81;
const U2FHID_MSG   = 0x83;
const U2FHID_INIT  = 0x86;
const U2FHID_ERROR = 0xbf;

const parseInitializationPacket = function (octet) {
    return {
        cid: octet.readUInt32BE(0),
        cmd: octet[4],
        bcnt: octet.readUInt16BE(5),
        data: octet.slice(7)
    };
};

const parseContinuationPacket = function (octet) {
    return {
        cid: octet.readUInt32BE(0),
        seq: octet[4],
        data: octet.slice(5)
    };
};

const responseMessageToResponsePackets = function (cid, cmd, data) {
    const arr = [];

    arr.push(Buffer.concat([
        Buffer.from([cid >> 24 & 0xff, cid >> 16 & 0xff, cid >> 8 & 0xff, cid & 0xff]),
        Buffer.from([cmd]),
        Buffer.from([data.length >> 8 & 0xff, data.length & 0xff]),
        data.slice(0, 57)
    ]));
    data = data.slice(57);

    let i = 0;
    while (data.length > 0) {
        arr.push(Buffer.concat([
            Buffer.from([cid >> 24 & 0xff, cid >> 16 & 0xff, cid >> 8 & 0xff, cid & 0xff]),
            Buffer.from([i]),
            data.slice(0, 59)
        ]));
        data = data.slice(59);
        i++;
    }

    return arr;
};

const outputReportProcessorFactory = function (rawMessageProcessor) {

    let _cid = 0;
    let _cmd = 0;
    let _bcnt = 0;
    let _data = Buffer.alloc(0);

    const outputReportProcessor = function (outputReport, inputReportsHandler) {
        assert(outputReport.length === 64);
        if (outputReport[4] >> 7) {
            console.log('get an initialization packet');
            _process_request_initialization_packet(outputReport, inputReportsHandler);
        } else {
            console.log('get a continuation packet');
            _process_request_continuation_packet(outputReport, inputReportsHandler);
        }
    };

    const _process_request_initialization_packet = function (octets, inputReportsHandler) {
        const pkt = parseInitializationPacket(octets);

        if (_cid && pkt.cid != _cid) {
            console.log('.. reject the packet');
            inputReportsHandler(responseMessageToResponsePackets(pkt.cid, U2FHID_ERROR, Buffer.from([0x06]))); // immediately respond a BUSY
            return;
        }

        if (pkt.bcnt <= 57) {
            backend(pkt.cid, pkt.cmd, pkt.data.slice(0, pkt.bcnt), inputReportsHandler);
        } else if (pkt.bcnt <= 7609) {
            _cid = pkt.cid;
            _cmd = pkt.cmd;
            _bcnt = pkt.bcnt;
            _data = pkt.data;
        } else {
            assert(false);
        }
    };

    const _process_request_continuation_packet = function (octets, inputReportsHandler) {
        const pkt = parseContinuationPacket(octets);

        if (_cid && pkt.cid !== _cid) {
            console.log('.. reject the packet');
            inputReportsHandler(responseMessageToResponsePackets(pkt.cid, U2FHID_ERROR, Buffer.from([0x06]))); // immediately respond a BUSY
            return;
        }

        _data = Buffer.concat([_data, pkt.data]);
        if (_data.length >= _bcnt) {
            backend(_cid, _cmd, _data.slice(0, _bcnt), inputReportsHandler);
        }
    };

    const backend = function (cid, cmd, data, inputReportsHandler) {

        console.log(`ENTER backend() with cid=${cid} cmd=${cmd} data=${data.toString('hex')}`);

        if (cmd !== U2FHID_INIT && cmd !== U2FHID_PING && cmd !== U2FHID_MSG) {
            console.log(`Got an unknow request message CMD=${cmd}`);
            inputReportsHandler(responseMessageToResponsePackets(_cid, U2FHID_ERROR, Buffer.from([0x06]))); // unknown command error
            return;
        }

        if (cmd === U2FHID_INIT && data.length === 8) {
            console.log('Got INIT U2FHID request message');
            _cid = 0;
            inputReportsHandler(
                responseMessageToResponsePackets(
                    cid,
                    U2FHID_INIT,
                    Buffer.concat([
                        data,
                        ((cid === 0xffffffff) ? crypto.randomBytes(4) : Buffer.from([cid >> 24, cid >> 16 & 0xff, cid >> 8 & 0xff, cid & 0xff])),
                        Buffer.from('0200000000', 'hex')
                    ])
                )
            );
            return;
        }

        if (cmd === U2FHID_PING) {
            console.log('Got PING U2FHID request message');
            _cid = 0;
            inputReportsHandler(responseMessageToResponsePackets(cid, cmd, data));
            return;
        }

        if (cmd === U2FHID_MSG) {
            console.log('Got MSG U2FHID request message');
            rawMessageProcessor(data, (resp, timeouterror)=>{
                _cid = 0;
                if (timeouterror) {
                    inputReportsHandler(responseMessageToResponsePackets(cid, U2FHID_ERROR, Buffer.from([0x05]))); // TIMEOUT
                } else {
                    inputReportsHandler(responseMessageToResponsePackets(cid, cmd, resp));
                }
            });
            return;
        }
    };

    return outputReportProcessor;
};

module.exports = outputReportProcessorFactory;
