import {
  MAIN_KEY,
  isTest,
  isDevelopment,
  isProduction,
} from '../config';
import { findDeveloper } from '../controllers/developers/utils';

const PROD_LIMIT = 2500;
const FALLBACK_API_KEY = 'fallback_api_key';

const determineLimit = (apiLimit) => (
  isTest
    ? apiLimit || PROD_LIMIT
    : PROD_LIMIT
);

const isSameDate = (first, second) => (
  first.getFullYear() === second.getFullYear()
    && first.getMonth() === second.getMonth()
    && first.getDate() === second.getDate()
);

/* Increments usage count and updates usage date */
const handleDeveloperUsage = async (developer) => {
  const updatedDeveloper = developer;
  const isNewDay = !isSameDate(updatedDeveloper.usage.date, new Date());
  updatedDeveloper.usage.date = Date.now();

  if (isNewDay) {
    updatedDeveloper.usage.count = 0;
  } else {
    updatedDeveloper.usage.count += 1;
  }

  return updatedDeveloper.save();
};

export default async (req, res, next) => {
  try {
    const { apiLimit } = req.query;
    let apiKey = req.headers['X-API-Key'] || req.headers['x-api-key'];

    /* Official sites can bypass validation */
    if (apiKey === MAIN_KEY) {
      req.isUsingMainKey = true;
      return next();
    }
    req.isUsingMainKey = false;

    if (!apiKey && isDevelopment) {
      apiKey = FALLBACK_API_KEY;
    }
    if (!apiKey) {
      throw new Error('X-API-Key Header doesn\'t exist');
    }

    /* While in development or testing, using the FALLBACK_API_KEY will grant access */
    if (apiKey === FALLBACK_API_KEY && !isProduction) {
      return next();
    }

    const developer = await findDeveloper(apiKey);

    if (developer) {
      if (developer.usage.count >= determineLimit(apiLimit)) {
        res.status(403);
        return res.send({ error: 'You have exceeded your limit of requests for the day' });
      }
      await handleDeveloperUsage(developer);
      return next();
    }

    res.status(401);
    return res.send({ error: 'Your API key is invalid' });
  } catch (err) {
    res.status(400);
    return res.send({ error: err.message });
  }
};
