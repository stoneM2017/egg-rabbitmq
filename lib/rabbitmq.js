'use strict';

const amqp = require('amqplib');
const Promise = require('bluebird');
const aliyunAmqpCli = require('aliyun-amqp-node-cli');
const EventEmitter = require('events').EventEmitter;

class RabbitMQ extends EventEmitter{
    constructor(config) {
        super();
        this._connection = null;
        this._channel = null;
        this._url = config.url;
        this._credentials = config.credentials;
        this._protocal = config.protocal;
        this._connectOptions = config.options;
        this._exchange = config.exchange;
        this._deadLetterExchange = config.deadLetterExchange;
        this.reConnectIntervalInSeconds = 5000;
        this._consumerFuncs = [];
    };

    async retryConnect() {
        try{
            await this.connect();
            await this.createChannel();
        } catch(err) {
            this.emit('error',  err);
            setTimeout(async () => {  
                await this.retryConnect(); 
            }, this.reConnectIntervalInSeconds);
        }
    }

    async connect() {
        if (this._protocal === "ALI_AMQP") {
            this._connection = await aliyunAmqpCli(this._credentials)(amqp).connect(this._url, this._connectOptions);
        } else {
            this._connection = await amqp.connect(this._url, this._connectOptions);
        }
        this._connection.on('blocked', reason => this.emit('blocked', { reason }));
        this._connection.on('unblocked', () => this.emit('unblocked'));
        this._connection.on('error', err => {
            this.emit('error',  err);
        });
        this._connection.on('close', async (err) =>  {
            this.emit('close',  err);
            this._connection = null;
            await this.retryConnect();
        });
        this.emit('connect', this._connection);
    };

    async createChannel() {
        this._channel = await this._connection.createConfirmChannel();
        this._channel.on('close', () => this._onChannelClose(null));
        this._channel.on('error', error => this._onChannelError(error));
        this._channel.on('return', msg => this._onChannelReturn(msg));
        this._channel.on('drain', () => this._onChannelDrain());
        this.emit('ch_open', this._channel);
        if (this._consumerFuncs.length > 0) {
            for(let i=0;i<this._consumerFuncs.length;i++) {
                await this._consumerFuncs[i]();
            }
        }
    };

    async _onChannelError(error) {
        this.emit("ch_error", error);
    };

    async _onChannelClose(error) {
        this.emit("ch_close", error);
        this._channel = null;
    };

    _onChannelReturn(msg) {
        this.emit('ch_return', msg);
    }

    _onChannelDrain() {
        this.emit('ch_drain');
    }

    assertExchange(exchange, type, options={}) {
        return this._channel.assertExchange(exchange, type, options);
    }

    assertQueue(queue, options={}) {
        return this._channel.assertQueue(queue, options);
    }

    checkQueue(queue) {
        return this._channel.checkQueue(queue);
    }

    bindQueue(queue, source, pattern, args={}) {
        return this._channel.bindQueue(queue, source, pattern, args);
    }

    publish(exchange, routingKey, msg, options={}) {
        return new Promise((resolve, reject) => {
            this._channel.publish(exchange, routingKey, msg, options, function(err, ok){
                if (err) {
                    reject(err);
                } else {
                    resolve(null);
                }
            });
        }) 
    }

    prefetch(count) {
        return this._channel.prefetch(count);
    }

    sendToQueue(queue, msg, options={}) {
        return new Promise((resolve, reject) => {
            this._channel.sendToQueue(queue, msg, options, function(err, ok) {
                if (err) {
                    reject(err);
                } else {
                    resolve(null);
                }
            });
        });
    }

    startConsume(queue, consumeFunc, options={}) {
        return this._channel.consume(queue, consumeFunc, options);
    }

    get(queue, options={}) {
        return this._channel.get(queue, options);
    }

    ack() {
        return this._channel && this._channel.ack.apply(this._channel, arguments);
    }

    nack() {
        return this._channel && this._channel.nack.apply(this._channel, arguments);
    }

    async createBinding(exchange, binding) {
        await this.assertQueue(binding.queue, binding.options);
        await this.bindQueue(binding.queue, exchange, binding.key);
    }

    async init() {
        await this.connect();
        await this.createChannel();
        if(this._exchange) {
            await this.assertExchange(this._exchange.name, this._exchange.type, this._exchange.options);
            await Promise.map(this._exchange.bindings, binding => this.createBinding(this._exchange.name, binding), {concurrency:1});
        }
        if(this._deadLetterExchange) {
            await this.assertExchange(this._deadLetterExchange.name, this._deadLetterExchange.type, this._deadLetterExchange.options);
            await Promise.map(this._deadLetterExchange.bindings, binding => this.createBinding(this._deadLetterExchange.name, binding), {concurrency:1});
        }
    }

    async consumer(queue, fn, options) {
        await this.prefetch(1);
        await this.startConsume(queue, fn, options);
    }

    async registerConsumer(queue, fn, options) {
        let consumerInstance = this.consumer.bind(this, queue, fn, options);
        this._consumerFuncs.push(consumerInstance);
        await consumerInstance();
    }
};

module.exports = RabbitMQ;
