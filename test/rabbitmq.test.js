'use strict';

const mock = require('egg-mock');

let app;

async function messageHandler(message) {
  const key = message.fields.routingKey;
  const content = JSON.parse(message.content);
  console.log("Recv msg:", key, content);
  await app.rabbitmq.get('consumer').ack(message);
}

describe('test/rabbitmq.test.js', () => {
  before(() => {
    app = mock.app({
      baseDir: 'apps/rabbitmq-test',
    });
    return app.ready();
  });

  after(() => app.close());
  afterEach(mock.restore);

  it('should get published msg', async() => {
    let msg = {
      data: "hi, rabbitmq"
    };
    await app.rabbitmq.get('consumer').publish("Test_Exchange", "Test", Buffer.from(JSON.stringify(msg)), {persistence: true, mandatory: true});
  });

  it('consume message', async() => {
    const consumer = app.rabbitmq.get('consumer');
    consumer.registerConsumer('Test_Queue', messageHandler, { noAck: false }, 1);
    await new Promise(resolve=>setTimeout(resolve, 10000));
  }).timeout(20000);
});
