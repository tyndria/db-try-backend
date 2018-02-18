import crypto from 'crypto';

const STRING_TYPE = 'string';

export const getRandom = (type) => {
  return type.toLowerCase() === STRING_TYPE ? getRandomString() : getRandomNumber();
};

function getRandomString() {
  return crypto.randomBytes(64).toString('hex');
}

function getRandomNumber() {
  return Math.random();
}