'use strict';

const Controller = require('egg').Controller;

class HomeController extends Controller {
  async index() {
    this.ctx.body = 'hi, ' + this.app.plugins.rabbitmq.name;
  }

  async publish() {
    let err = await this.app.rabbitmq.get('producer').publish("Test_Exchange", "Test", Buffer.from(JSON.stringify(this.ctx.request.body)), {persistence: true, mandatory: true});
    if (err) {
      console.log("Publish msg failed, error:", err);
      throw("could not publish message");
    }

    let msg = await this.app.rabbitmq.get('consumer').get("Test_Queue", {});
    await this.app.rabbitmq.get('consumer').ack(msg);
    this.ctx.body = JSON.parse(msg.content);
  }
}

module.exports = HomeController;
