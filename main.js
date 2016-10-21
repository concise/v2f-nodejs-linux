const V2FPATH =
    process.env.V2FPATH ? process.env.V2FPATH :
    process.argv.length > 2 ? process.argv[2] :
    process.env.HOME + '/.v2f';

const u2fCoreFactory = require('./u2fcore');
const u2fCore = u2fCoreFactory(V2FPATH);

const rawMessageProcessorFactory = require('./u2fraw');
const rawMessageProcessor = rawMessageProcessorFactory(u2fCore);

const outputReportProcessorFactory = require('./u2fhid');
const outputReportProcessor = outputReportProcessorFactory(rawMessageProcessor);

const uhidEventLoopFactory = require('./uhid');
const uhidEventLoop = uhidEventLoopFactory(outputReportProcessor);

process.on('SIGINT', function () { process.kill(process.pid); });

uhidEventLoop();
