'use strict';

const RabbitMQ = require('./lib/rabbitmq');
const assert = require('assert');

module.exports = app => {
    app.addSingleton('rabbitmq', createRabbitMQ);
}

function createRabbitMQ(config, app) {
    assert(config.url && config.exchange && config.bindings);
    const client = new RabbitMQ(config);
    
    client.on('connect', connection => {
        app.coreLogger.info('[egg-rabbitmq] server connected! connection=' + connection.connection.connection.stream.localAddress + ':' + connection.connection.connection.stream.localPort);
    })
    
    client.on('close', () => {
        app.coreLogger.info('[egg-rabbitmq] connection closed');
    })

    client.on('error', error => {
        app.coreLogger.error('[egg-rabbitmq] connection error:', error);
    })

    client.on('ch_open', channel => {
        app.coreLogger.info('[egg-rabbitmq] channel opened! channel=' + channel.channel.connection.stream.localAddress + ':' + channel.channel.connection.stream.localPort);
    });

    client.on('ch_close', () => {
        app.coreLogger.info('[egg-rabbitmq] channel closed');
    })

    client.on('ch_error', () => {
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