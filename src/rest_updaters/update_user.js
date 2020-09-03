class RESTUserUpdater {
  constructor(bucketClearInterval) {
    if (bucketClearInterval) {
      this.bucket = {};
      setInterval(() => {
        this.bucket = {};
      }, bucketClearInterval);
    }
  }

  async update(erisBot, userId) {
    if (this.bucket && this.bucket[userId]) {
      return erisBot.users.get(userId);
    }

    const restUser = await erisBot.getRESTUser(userId);
    if (!restUser) {
      throw new Error('Failed to get REST user.');
    }

    erisBot.users.update(restUser, erisBot);

    if (this.bucket) {
      this.bucket[userId] = true;
    }

    return erisBot.users.get(userId);
  }
}

module.exports = RESTUserUpdater;
