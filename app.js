'use strict';

const RabbitMQ = require('./lib/rabbitmq');
const assert = require('assert');

module.exports = app => {
    app.addSingleton('rabbitmq', createRabbitMQ);
}

function createRabbitMQ(config, app) {
    const client = new RabbitMQ(config);
    
    client.on('connect', connection => {
        app.coreLogger.info('[egg-rabbitmq] server connected! connection=' + connection.connection.stream.localAddress + ':' + connection.connection.stream.localPort);
    })
    
    client.on('close', error => {
        app.coreLogger.info('[egg-rabbitmq] connection closed due to error:', error);
    })

    client.on('error', error => {
        app.coreLogger.error('[egg-rabbitmq] connection error:', error);
    })

    client.on('ch_open', channel => {
        app.coreLogger.info('[egg-rabbitmq] channel opened!');
    });

    client.on('ch_close', () => {
        app.coreLogger.info('[egg-rabbitmq] channel closed');
    })

    client.on('ch_error', error => {
        app.coreLogger.error('[egg-rabbitmq] channel error:', error);
    })

    client.on('ch_drain', () => {
        app.coreLogger.error('[egg-rabbitmq] channel drain event');
    })

    app.beforeStart(async ()=>{
        app.coreLogger.info('[egg-rabbitmq] Connecting RabbitMQ...');
        await client.init();
    })

    return client;
}
