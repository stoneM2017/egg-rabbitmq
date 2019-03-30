'use strict';

const mock = require('egg-mock');

describe('test/rabbitmq.test.js', () => {
  let app;
  before(() => {
    app = mock.app({
      baseDir: 'apps/rabbitmq-test',
    });
    return app.ready();
  });

  after(() => app.close());
  afterEach(mock.restore);

  it('should get published msg', () => {
    let msg = {
      data: "hi, rabbitmq"
    }
    return app.httpRequest()
      .post('/publish')
      .send(msg)
      .expect(msg)
      .expect(200);
  });
});
