const accessKeyCache = new Map();

export const cacheAccessKey = (userId, accessKey) => {
  accessKeyCache.set(userId, accessKey);
};

export const getCachedAccessKey = (userId) => {
  return accessKeyCache.get(userId);
};

export const removeCachedAccessKey = (userId) => {
  accessKeyCache.delete(userId);
};
