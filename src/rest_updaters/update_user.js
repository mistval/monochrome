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
    const cacheUser = erisBot.users.get(userId);

    if (cacheUser) {
      Object.assign(cacheUser, restUser);
    } else if (restUser) {
      erisBot.users.add(restUser);
    }

    const updatedUser = cacheUser || restUser;
    if (this.bucket && updatedUser) {
      this.bucket[userId] = true;
    }

    return updatedUser;
  }
}

module.exports = RESTUserUpdater;
