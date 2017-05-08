const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const u2fcrypto = require('./u2fcrypto');

const u2fCoreFactory = function (V2FPATH) {

    const masterSecretKeyFileName = V2FPATH + '/master-secret-key';
    const authCounterFileName = V2FPATH + '/auth-counter';

    if (!fs.existsSync(V2FPATH)) {
        fs.mkdirSync(V2FPATH, 0o700);
    }
    if (!fs.existsSync(masterSecretKeyFileName)) {
        fs.writeFileSync(masterSecretKeyFileName, crypto.randomBytes(64));
    }
    if (!fs.existsSync(authCounterFileName)) {
        fs.writeFileSync(authCounterFileName, Buffer.alloc(4));
    }

    const masterSecretKey = fs.readFileSync(masterSecretKeyFileName);
    assert(masterSecretKey.length === 64);
    const hmacKey = masterSecretKey.slice(0, 32);
    const kgenKey = masterSecretKey.slice(32);

    const compute_private_key = function (ap, kh) {
        const nonce = kh.slice(0, 32);
        return u2fcrypto.rfc6979sha256p256csprng(
            Buffer.concat([kgenKey, nonce, ap])
        ).next().value;
    };

    const u2fCore = {

        generate_key_handle: function (ap, additional_entropy) {
            const nonce = u2fcrypto.hmacsha256(crypto.randomBytes(32), additional_entropy);
            const mac = u2fcrypto.hmacsha256(hmacKey, Buffer.concat([ap, nonce]));
            //console.log('nonce =', nonce.toString('hex'));
            //console.log('mac =', mac.toString('hex'));
            return Buffer.concat([nonce, mac]);
        },

        compute_public_key: function (ap, kh) {
            const private_key = compute_private_key(ap, kh);
            return u2fcrypto.privateKeyToPublicKey(private_key);
        },

        sign: function (ap, kh, msg) {
            const private_key = compute_private_key(ap, kh);
            return u2fcrypto.sign(private_key, msg);
        },

        is_good_key_handle: function (ap, kh) {
            const nonce = kh.slice(0, 32);
            const mac = kh.slice(32);
            //console.log('nonce =', nonce.toString('hex'));
            //console.log('mac =', mac.toString('hex'));
            return 0 === Buffer.compare(
                u2fcrypto.hmacsha256(hmacKey, Buffer.concat([ap, nonce])), mac);
        },

        get_incr_auth_counter: function () {
            const before = fs.readFileSync(authCounterFileName);
            assert(before.length === 4);

            const after = Buffer.alloc(4);
            after.writeUInt32BE(before.readUInt32BE(0) + 1, 0);
            fs.writeFileSync(authCounterFileName, after);

            return before;
        }

    };

    return u2fCore;
};

module.exports = u2fCoreFactory;
