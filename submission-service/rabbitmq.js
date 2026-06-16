const amqp = require("amqplib");

let channel;

async function connectRabbitMQ() {
  let connected = false;

  while (!connected) {
    try {
      const connection = await amqp.connect(process.env.RABBITMQ_URL);
      channel = await connection.createChannel();

      await channel.assertQueue("scoring_queue", {
        durable: true,
      });

      connected = true;
      console.log("Submission Service connected to RabbitMQ");
    } catch (error) {
      console.log("RabbitMQ not ready, retrying in 5 seconds...");
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
}

function publishScoringJob(job) {
  if (!channel) {
    throw new Error("RabbitMQ channel is not initialized");
  }

  channel.sendToQueue(
    "scoring_queue",
    Buffer.from(JSON.stringify(job)),
    {
      persistent: true,
    }
  );
}

module.exports = {
  connectRabbitMQ,
  publishScoringJob,
};