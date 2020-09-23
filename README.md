# egg-rabbitmq
rabbitmq plugin for egg.js
# Install
$ npm i egg-rabbitmqjs --save
# Configuration
## Multiple Instances
```js
// {app_root}/config/config.default.js
exports.rabbitmq = {
    clients: {
        instance1: {
            url: 'amqp://localhost',
            options: {},
            exchange: {
                name: "xxx",
                type: "direct",
                options: { 
                    durable: true
                },
                bindings: [
                    { queue: "queuename", key: "key", options:{} }
                ],
            },
            deadLetterExchange: {
                name: "xxx",
                type: "direct",
                options: {
                    durable: true
                },
                bindings: [
                    { queue: "queuename", key: "key", options:{} }
                ],
            },
        },
        instance2: {
            url: 'amqp://localhost',
            options: {},
            exchange: {
                name: "xxx",
                type: "direct",
                options: { 
                    durable: true
                },
                bindings: [
                    { queue: "queuename", key: "key", options:{} }
                ],
            },
            deadLetterExchange: {
                name: "xxx",
                type: "direct",
                options: {
                    durable: true
                },
                bindings: [
                    { queue: "queuename", key: "key", options:{} }
                ],
            },
        },
    },
};
```
# Example
## configration
```js
config.rabbitmq = {
    clients: {
      producer: {
          url: 'amqp://localhost',
          options: {},
          exchange: {
              name: "EXCHNAGE_NAME",
              type: "direct",
              options: {
                  durable: true
              },
              bindings: [
                  { queue: "QUEUE_NAME", key: "KEY", options: { exclusive: false, durable: true, maxPriority: 10, deadLetterExchange: "DLX_EXCHANGE" } },
              ],
          },
          deadLetterExchange: {
              name: "DLX_EXCHANGE",
              type: "direct",
              options: {
                  durable: true
              },
              bindings: [
                  { queue: "DLX_QUEUE_NAME", key: "KEY", options: { exclusive: false, durable: true, maxPriority: 10, deadLetterExchange: "DLX_EXCHANGE" } },
              ],
          },
      },
    }
  };
  ```
  ## Usage
  ```js
  let message = {...};
  this.app.rabbitmq.get('producer').publish("EXCHANGE_NAME", message.Key, Buffer.from(JSON.stringify(message)), { priority: message.Priority, persistent: true, mandatory: true });
  ```
