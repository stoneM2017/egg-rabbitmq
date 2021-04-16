'use strict';

exports.keys = '123456';

exports.security = {
    csrf: false
}

exports.rabbitmq = {
    clients: {
        consumer: {
            url: 'amqp://localhost',
            options: {},
            exchange: {
                name: "Test_Exchange",
                type: "direct",
                options: { 
                    durable: true
                },
                bindings: [
                    { queue: "Test_Queue", key: "Test" , options: {exclusive: false, durable:true, maxPriority:10, deadLetterExchange:"Test_Exchange_DLX"}},
                ],
            },
            deadLetterExchange: null
        }
    }
}