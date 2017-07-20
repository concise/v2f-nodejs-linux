/*

1. initiate
curl http://13.228.30.144:8080/api/login/js -X POST

2. poll
curl http://13.228.30.144:8080/api/req/js

3. accept or reject
curl http://13.228.30.144:8080/api/action/js -F action=accept
curl http://13.228.30.144:8080/api/action/js -F action=reject

*/

const fetch = require('node-fetch');

const APPR_ID = process.env.V2FAPPRID;
const API_BASE_URL = 'http://13.228.30.144:8080';

if (!(typeof APPR_ID === 'string' && /^[a-zA-Z0-9._-]+$/.test(APPR_ID))) {
    throw Error('the environment variable V2FAPPRID is not defined or invalid');
}

const wait = (ms, val) => new Promise(f => setTimeout(f, ms, val));

const createUserApprovalRequest = () => (
    // send POST request to initiate a new approval request
    fetch(`${API_BASE_URL}/api/login/${APPR_ID}`, {method: 'post'})
        .then(s => s.text())        // parse the response as plain text
        .then(t => t.trimRight())   // remove trailing new line character
);

const getUserApprovalRequestState = (id) => (
    // send GET request to poll the current status
    fetch(`${API_BASE_URL}/api/req/${APPR_ID}`)
        .then(s => s.text())        // parse the response as plain text
        .then(t => t.trimRight())   // remove trailing new line character
);

const getUserApprovalBit = async () => {

    const id = await createUserApprovalRequest();

    let expired = false;

    setTimeout(() => {
        expired = true;
    }, 60000);

    while (true) {
        const [_, state] = await Promise.all([
            wait(1000), getUserApprovalRequestState(id) ]);
        if (state === 'accept')
            return true;
        if (state === 'reject')
            return false;
        if (state !== 'waiting')
            throw RangeError('Unexpected HTTP response: "' + state + '"');
        if (expired)
            return false;
    }
};

module.exports = getUserApprovalBit;
