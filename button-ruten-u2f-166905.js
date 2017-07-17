/*

Old RPC API:
    createUserApprovalRequest   : ()                        -> (reqId)
    getUserApprovalRequestState : (reqId)                   -> (state)  OR ERR
    userPerformAction           : (action)                  -> ()       OR ERR
    userPerformAction           : (action, reqId)           -> ()       OR ERR

New RPC API:
    createUserApprovalRequest   : (apprId)                  -> (reqId)
    getUserApprovalRequestState : (apprId, reqId)           -> (state)  OR ERR
    userPerformAction           : (apprId, action)          -> ()       OR ERR
    userPerformAction           : (apprId, action, reqId)   -> ()       OR ERR

------------------------------------------------------------------------------

Old RPC Server Implementation:

    POST /api/login                                             -> {reqId}
    POST /api/req/{reqId}                                       -> {state}
    POST /api/action         with body action={action}          -> ()
    POST /api/action/{reqId} with body action={action}          -> ()

New RPC Server Implementation:

    POST /api/login/{apprId}                                    -> {reqId}
    POST /api/req/{apprId}/{reqId}                              -> {state}
    POST /api/action/{apprId}         with body action={action} -> ()
    POST /api/action/{apprId}/{reqId} with body action={action} -> ()

*/

const fetch = require('node-fetch');

const apprId = process.env.V2FAPPRID;
const URL_A = `https://ruten-u2f-166905.appspot.com/api/login/${apprId}`;
const URL_B = `https://ruten-u2f-166905.appspot.com/api/req/${apprId}/`;

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
