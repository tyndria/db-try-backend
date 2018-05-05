import crypto from 'crypto';
import sampleSize from 'lodash/sampleSize';
import random from 'lodash/random';

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

export const getRandomSample = (array, size) => sampleSize(array, random(1, array.length - 1));
