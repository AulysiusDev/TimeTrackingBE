const accessKeyCache = new Map();

export const cacheAccessKey = (userId, accessKey) => {
  accessKeyCache.set(userId, accessKey);
};

export const getAccessKey = (userId) => {
  return accessKeyCache.get(userId);
};

export const removeAccessKey = (userId) => {
  accessKeyCache.delete(userId);
};
