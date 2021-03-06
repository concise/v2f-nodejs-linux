const u2fcrypto = require('./u2fcrypto');

const U2F_REGISTER                  = 0x01;
const U2F_AUTHENTICATE              = 0x02;
const U2F_VERSION                   = 0x03;
const SW_NO_ERROR                   = 0x9000;
const SW_CONDITIONS_NOT_SATISFIED   = 0x6985;
const SW_WRONG_DATA                 = 0x6984;
const SW_INS_NOT_SUPPORTED          = 0x6d00;

const rawMessageProcessorFactory = function (u2fCore) {

    const rawMessageProcessor = function (apduCommand) {
        console.log('apduCommand =', apduCommand.toString('hex'));

        let [cla, ins, p1, p2, lc1, lc2, lc3, ...data] = apduCommand;
        let reqDataLen = (lc1 << 16) | (lc2 << 8) | lc3;
        data = Buffer.from(data).slice(0, reqDataLen);

        if (ins === U2F_REGISTER) {
            if (data.length !== 64) {
                return Buffer.from([0x69, 0x84]);
            }

            const cp = data.slice(0, 32);
            const ap = data.slice(32, 64);
            const kh = u2fCore.generate_key_handle(ap, cp);
            const pk = u2fCore.compute_public_key(ap, kh);
            const cert = u2fcrypto.x509Encode(pk);
            const msg = Buffer.concat([Buffer.from([0x00]), ap, cp, kh, pk]);
            const sig = u2fCore.sign(ap, kh, msg);
            console.log('Generating new key handle...');
            return Buffer.concat([
                Buffer.from([0x05]),
                pk,
                Buffer.from([kh.length]),
                kh,
                cert,
                sig,
                Buffer.from([0x90, 0x00])
            ]);

        } else if (ins === U2F_AUTHENTICATE && p1 === 7) {

            const cp = data.slice(0, 32);
            const ap = data.slice(32, 64);
            const kh = data.slice(65, 65 + data[64]);
            const ok = u2fCore.is_good_key_handle(ap, kh);
            if (!ok) {
                console.log('Checking key handle -> bad key handle');
                return Buffer.from([0x69, 0x84]);
            }
            console.log('Checking key handle -> good key handle');
            return Buffer.from([0x69, 0x85]);

        } else if (ins === U2F_AUTHENTICATE && p1 === 3) {

            const cp = data.slice(0, 32);
            const ap = data.slice(32, 64);
            const kh = data.slice(65, 65 + data[64]);
            const ok = u2fCore.is_good_key_handle(ap, kh);
            if (!ok) {
                console.log('Checking key handle -> bad key handle');
                return Buffer.from([0x69, 0x84]);
            }
            const counterBytes = u2fCore.get_incr_auth_counter();
            const msg = Buffer.concat([ap, Buffer.from([0x01]), counterBytes, cp]);
            const sig = u2fCore.sign(ap, kh, msg);
            console.log('Generating identity assertion...');
            return Buffer.concat([Buffer.from([0x01]), counterBytes, sig, Buffer.from([0x90, 0x00])]);

        } else if (ins === U2F_VERSION) {
            console.log('Reporting version number...');
            return Buffer.concat([Buffer.from('U2F_V2'), Buffer.from([0x90, 0x00])]);
        } else {
            return Buffer.from([0x6d, 0x00]);
        }
    };

    return rawMessageProcessor;
};

module.exports = rawMessageProcessorFactory;
