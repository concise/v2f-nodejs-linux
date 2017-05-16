const fetch = require('node-fetch');

const URL_A = 'https://ruten-u2f-166905.appspot.com/api/login';
const URL_B = 'https://ruten-u2f-166905.appspot.com/api/req/';

const wait = (ms, val) => new Promise(f => setTimeout(f, ms, val));

const createUserApprovalRequest = () => (
    fetch(URL_A, {method: 'post'})  // send POST request
        .then(s => s.text())        // parse the response as plain text
        .then(t => t.trimRight())   // remove trailing new line character
);

const getUserApprovalRequestState = (id) => (
    fetch(URL_B + id)               // send GET request
        .then(s => s.text())        // parse the response as plain text
        .then(t => t.trimRight())   // remove trailing new line character
);

const getUserApprovalBit = async () => {

    const id = await createUserApprovalRequest();

    console.log('Somebody has to do' +
        ' `curl https://ruten-u2f-166905.appspot.com/api/action' +
        ' -F action=accept` in order to approve the U2F request');

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
