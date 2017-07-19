/*

1. initiate
curl http://13.228.30.144:8080/api/login/js -X POST

2. poll
curl http://13.228.30.144:8080/api/req/js

3. accept or reject
curl http://13.228.30.144:8080/api/action/js -X POST -F action=accept
curl http://13.228.30.144:8080/api/action/js -X POST -F action=reject

*/

const fetch = require('node-fetch');

const apprId = process.env.V2FAPPRID;
const URL_A = `http://13.228.30.144:8080/api/login/${apprId}`;
const URL_B = `http://13.228.30.144:8080/api/req/${apprId}`;

const wait = (ms, val) => new Promise(f => setTimeout(f, ms, val));

const createUserApprovalRequest = () => (
    fetch(URL_A, {method: 'post'})  // send POST request
        .then(s => s.text())        // parse the response as plain text
        .then(t => t.trimRight())   // remove trailing new line character
);

const getUserApprovalRequestState = (id) => (
    fetch(URL_B)                    // send GET request
        .then(s => s.text())        // parse the response as plain text
        .then(t => t.trimRight())   // remove trailing new line character
);

const getUserApprovalBit = async () => {

    const id = await createUserApprovalRequest();

    let expired = false;

    setTimeout(() => {
        expired = true;
    }, 10000);

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
