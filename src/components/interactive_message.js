const assert = require('assert');
const util = require('util');
const EventEmitter = require('events');

const AUTO_TIMEOUT_MS = 1000 * 60 * 14; // 14 minutes
const ACKNOWLEDGE_TIMEOUT_MS = 1000 * 2; // 2 seconds

const interactiveMessageForMessageId = new Map();
const sleep = util.promisify(setTimeout);

async function retryPromise(promiseFactory, retryCount = 3) {
  let retriesLeft = retryCount;

  do {
    try {
      // eslint-disable-next-line no-await-in-loop
      return await promiseFactory();
    } catch (err) {
      retriesLeft -= 1;
      if (retriesLeft <= 0) {
        throw err;
      }
    }
  } while (retriesLeft > 0);

  assert(false, 'Unexpected branch');
  return undefined;
}

class InteractiveMessage extends EventEmitter {
  constructor(ownerId, { id, parentMessage } = {}) {
    super();
    this.id = id ?? 'interactive_message';
    this.ownerId = ownerId;
    this.parentMessage = parentMessage;
  }

  setComponents(componentGroup) {
    this.components = componentGroup;
    this.componentForId = Object.fromEntries(
      componentGroup.flatMap((group) => group.components)
        .map((component) => [component.custom_id, component]),
    );
  }

  setEmbeds(embeds) {
    this.embeds = embeds;
  }

  async disableInteraction() {
    if (!this.messagePromise) {
      return;
    }

    const message = await this.messagePromise;
    interactiveMessageForMessageId.delete(message.id);

    if (this.components?.length > 0) {
      this.setComponents([]);
      await this.sendOrUpdate();
    }
  }

  async sendOrUpdate(channel) {
    if (this.messagePromise) {
      const message = await this.messagePromise;
      return retryPromise(() => message.edit({
        embeds: this.embeds,
        components: this.components,
      }));
    }

    this.messagePromise = retryPromise(() => channel.createMessage({
      embeds: this.embeds,
      components: this.components,
    }, undefined, this.parentMessage));

    const message = await this.messagePromise;
    interactiveMessageForMessageId.set(message.id, this);

    setTimeout(async () => {
      try {
        await this.disableInteraction();
      } catch (err) {
        if (![10008, 10003].includes(err?.code)) {
          // 10008 = Unknown Message. Already deleted.
          // 10003 = Unknown Channel. Probably kicked from guild.
          this.emit('error', err);
        }
      }
    }, AUTO_TIMEOUT_MS);

    return message;
  }

  async handleInteraction(interaction) {
    if ((interaction.member ?? interaction.user)?.id !== this.ownerId) {
      return interaction.createMessage({
        content: 'Only the owner of this message can interact with it.',
        flags: 64,
      });
    }

    if (this.handlingInteraction) {
      return;
    }

    const component = this.componentForId[interaction.data.custom_id];

    if (!component) {
      return;
    }

    this.handlingInteraction = true;
    try {
      await component.action();
    } finally {
      this.handlingInteraction = false;
    }
  }

  static async handleInteraction(interaction) {
    const interactiveMessage = interactiveMessageForMessageId.get(interaction.message.id);

    if (!interactiveMessage) {
      return;
    }

    try {
      const handlePromise = interactiveMessage.handleInteraction(interaction);
      await Promise.race([
        handlePromise,
        sleep(ACKNOWLEDGE_TIMEOUT_MS),
      ]);

      if (!interaction.acknowledged) {
        await interaction.acknowledge();
      }

      await handlePromise;
    } catch (err) {
      err.interactiveMessageId = interactiveMessage.id;
      throw err;
    }
  }
}

module.exports = {
  InteractiveMessage,
};
