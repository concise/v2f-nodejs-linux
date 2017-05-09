// insecure, hardcoded username and password...  I am just too lazy
const USERNAME = 'user';
const PASSWORD = 'pass';


// {"username":"user","password":"pass"} -> {"id":"187a95e48b01e3b5"}
const URL_LOGIN = 'https://example.crypto.tw/login';


// {"id":"187a95e48b01e3b5"} -> {"state":"PENDING"}
//                              {"state":"ACCEPTED"}
//                              {"state":"REJECTED"}
const URL_CHECK = 'https://example.crypto.tw/check';


// need to perform some POST requests; just use JSON for request and response
const fetch = require('node-fetch');
const postjson = (url, requestObject) => (
    fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestObject)
    }).then(responseStream => responseStream.json())
);


const wait = (ms, val) => new Promise(f => setTimeout(f, ms, val));


const createApprovalRequest = async (username, password) => {
    const obj = await postjson(URL_LOGIN, { username, password });
    return obj.id;
};


const getApprovalState = async (apprvReqId) => {
    const obj = await postjson(URL_CHECK, { id: apprvReqId });
    return obj.state;
};


// -> either "ACCEPTED", "REJECTED", or "EXPIRED"
const waitTenSecondsForApproval = async (apprvReqId) => {
    let expired = false;
    setTimeout(() => { expired = true; }, 10000);
    while (!expired) {
        const [_, state] = await Promise.all([
            wait(1000), getApprovalState(apprvReqId) ]);
        if (state === 'ACCEPTED' || state === 'REJECTED') {
            return state;
        }
        if (state !== 'PENDING') {
            throw RangeError('Unexpected value');
        }
    }
    return 'EXPIRED';
};


// -> either true or false
const getUserApprovalBit = async () => {
    const id = await createApprovalRequest(USERNAME, PASSWORD);
    const result = await waitTenSecondsForApproval(id);
    return result === 'ACCEPTED';
};


module.exports = getUserApprovalBit;
