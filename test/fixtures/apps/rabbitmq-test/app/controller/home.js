'use strict';

const Controller = require('egg').Controller;

class HomeController extends Controller {
  async index() {
    this.ctx.body = 'hi, ' + this.app.plugins.rabbitmq.name;
  }

  async publish() {
    let err = await this.app.rabbitmq.get('consumer').publish("Test_Exchange", "Test", Buffer.from(JSON.stringify(this.ctx.request.body)), {persistence: true, mandatory: true});
    if (err) {
      console.log("Publish msg failed, error:", err);
      throw("could not publish message");
    }
  }
}

module.exports = HomeController;
