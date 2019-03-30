'use strict';

const amqp = require('amqplib');
const Promise = require('bluebird');
const EventEmitter = require('events').EventEmitter;

class RabbitMQ extends EventEmitter{
    constructor(config) {
        super();
        this._connection = null;
        this._channel = null;
        this._url = config.url;
        this._connectOptions = config.options;
        this._exchange = config.exchange;
        this._bindings = config.bindings;
        this.reConnectIntervalInSeconds = 5000;
        this._consumerFunc = null;
    };

    connect() {
        if (this._connection) {
            return Promise.resolve();
        }

        return amqp.connect(this._url, this._connectOptions)
            .then(connection => {
                this._connection = connection;
                this._connection.on('blocked', reason => this.emit('blocked', { reason }));
                this._connection.on('unblocked', () => this.emit('unblocked'));
                this._connection.on('error', err => {
                    this.emit('error', { err });
                    this.close()
                });

                this._connection.on('close', err => {
                    this._connection = null;
                    setTimeout(() => {this.connect()}, this.reConnectIntervalInSeconds);
                });
                this.emit('connect', { connection });
            })
            .catch(err => {
                this.emit('error', { err });
                this._connection = null;
                setTimeout(() => {this.connect()}, this.reConnectIntervalInSeconds * 2);
            });
    };

    close() {
        if (!this._connection) {
            return Promise.resolve();
        }

        return this._connection.close()
        .catch(() => { /* Ignore */ })
        .then(() => {
            return Promise.resolve();
        })
    };

    createChannel(fInit=true) {
        if (!this._connection && fInit) {
            return Promise.reject("no amqp connection");
        }

        return new Promise( (resolve,reject)=>{
            if (!this._connection) {
                return reject("amqp connection unavaliable");
            } else {
                return resolve(null);
            }
        })
        .then(()=>{
            return this._connection.createConfirmChannel();
        })
        .then(channel => {
            this._channel = channel;
            this._channel.on('close', () => this._onChannelClose(null));
            this._channel.on('error', error => this._onChannelError(error));
            this._channel.on('return', msg => this._onChannelReturn(msg));
            this._channel.on('drain', () => this._onChannelDrain());
            this.emit('ch_open', {channel});
            if (this._consumerFunc) {
                console.log("start consuming...");
                this._consumerFunc();
            }
        })
        .catch(err => {
            console.log("Exception when createChannel, error:", err);
            this.emit('ch_error', {err});
            this._channel = null;
            setTimeout( () => {this.createChannel(false)}, this.reConnectIntervalInSeconds);
        })
    };

    closeChannel() {
        if (!this._channel) {
            return Promise.resolve();
        }
        
        return this._channel.close()
        .then(() => {
            this._channel = null;
            this.emit('ch_close');
        });
    };

    _onChannelError(error) {
        this._channel = null;
        console.log("_onChannelError, error:", error);
        this.emit("ch_error", {error});
        setTimeout( () => {this.createChannel(false)}, this.reConnectIntervalInSeconds);
    };

    _onChannelClose(error) {
        this._channel = null;
        this.emit("ch_close", {error});
        setTimeout( () => {this.createChannel(false)}, this.reConnectIntervalInSeconds);
    };

    _onChannelReturn(msg) {
        this.emit('ch_return', {msg});
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

    async createBinding(binding) {
        await this.assertQueue(binding.queue, binding.options);
        await this.bindQueue(binding.queue, this._exchange.name, binding.key);
        await this.bindQueue(binding.queue, this._exchange.deadLetterExchange, binding.key);
    }

    async init() {
        await this.connect();
        await this.createChannel();
        await this.assertExchange(this._exchange.name, this._exchange.type, this._exchange.options);
        await this.assertExchange(this._exchange.deadLetterExchange, this._exchange.type, this._exchange.options);
        await Promise.map(this._bindings, binding => this.createBinding(binding), {concurrency:1});
    }

    async consumer(queue, fn, options) {
        await this.prefetch(1);
        await this.startConsume(queue, fn, options);
    }

    async registerConsumer(queue, fn, options) {
        this._consumerFunc = this.consumer.bind(this, queue, fn, options);
        await this._consumerFunc();
    }
};

module.exports = RabbitMQ;
