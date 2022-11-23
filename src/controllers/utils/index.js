import stringSimilarity from 'string-similarity';
import diacriticless from 'diacriticless';
import isNaN from 'lodash/isNaN';
import get from 'lodash/get';
import removePrefix from '../../shared/utils/removePrefix';
import createQueryRegex from '../../shared/utils/createQueryRegex';
import Versions from '../../shared/constants/Versions';

const DEFAULT_RESPONSE_LIMIT = 10;
const MAX_RESPONSE_LIMIT = 25;
const MATCHING_DEFINITION = 1000;
const SIMILARITY_FACTOR = 100;
const NO_FACTOR = 0;

const generateSecondaryKey = (version) => (
  version === Versions.VERSION_1 ? 'definitions[0]' : 'definitions[0].definitions[0]'
);

/* Determines if an empty response should be returned
 * if the request comes from an application not using MAIN_KEY
 */
const constructRegexQuery = ({ isUsingMainKey, searchWord }) => (
  isUsingMainKey
    ? createQueryRegex(searchWord)
    : searchWord
      ? createQueryRegex(searchWord)
      : { wordReg: /^[.{0,}\n{0,}]/, definitionsReg: /^[.{0,}\n{0,}]/ }
);

/* Sorts all the docs based on the provided searchWord */
export const sortDocsBy = (searchWord, docs, key, version) => (
  docs.sort((prevDoc, nextDoc) => {
    const normalizedSearchWord = searchWord.normalize('NFD');
    const prevDocValue = get(prevDoc, key);
    const nextDocValue = get(nextDoc, key);
    const prevDocDifference = stringSimilarity.compareTwoStrings(
      normalizedSearchWord,
      diacriticless(prevDocValue.normalize('NFD')),
    ) * SIMILARITY_FACTOR + ((get(prevDoc, generateSecondaryKey(version)) || '').includes(normalizedSearchWord)
      ? MATCHING_DEFINITION
      : NO_FACTOR);
    const nextDocDifference = stringSimilarity.compareTwoStrings(
      normalizedSearchWord,
      diacriticless(nextDocValue.normalize('NFD')),
    ) * SIMILARITY_FACTOR + ((get(nextDoc, generateSecondaryKey(version)) || '').includes(normalizedSearchWord)
      ? MATCHING_DEFINITION
      : NO_FACTOR);
    if (prevDocDifference === nextDocDifference) {
      return NO_FACTOR;
    }
    return prevDocDifference > nextDocDifference ? -1 : 1;
  })
);

/* Validates the provided range */
export const isValidRange = (range) => {
  if (!Array.isArray(range)) {
    return false;
  }

  /* Invalid range if first element is larger than the second */
  if (range[0] >= range[1]) {
    return false;
  }

  const validRange = range;
  validRange[1] += 1;
  return !(validRange[1] - validRange[0] > MAX_RESPONSE_LIMIT) && !(validRange[1] - validRange[0] < 0);
};

/* Takes both page and range and converts them into appropriate skip and limit */
export const convertToSkipAndLimit = ({ page, range }) => {
  let skip = 0;
  let limit = 10;
  if (isValidRange(range)) {
    [skip] = range;
    limit = range[1] - range[0];
    return { skip, limit };
  }

  if (isNaN(page)) {
    throw new Error('Page is not a number.');
  }
  const calculatedSkip = page * DEFAULT_RESPONSE_LIMIT;
  if (calculatedSkip < 0) {
    throw new Error('Page must be a positive number.');
  }
  return { skip: calculatedSkip, limit };
};

/* Packages the res response with sorting */
export const packageResponse = ({
  res,
  docs,
  contentLength,
}) => {
  res.setHeader('Content-Range', contentLength);
  return res.send(docs);
};

/* Converts the filter query into a word to be used as the keyword query */
const convertFilterToKeyword = (filter = '{"word": ""}') => {
  try {
    const parsedFilter = typeof filter === 'object' ? filter : JSON.parse(filter) || { word: '' };
    const firstFilterKey = Object.keys(parsedFilter)[0];
    return parsedFilter[firstFilterKey];
  } catch {
    throw new Error(`Invalid filter query syntax. Expected: {"word":"filter"}, Received: ${filter}`);
  }
};

/* Parses the ranges query to turn into an array */
const parseRange = (range) => {
  try {
    if (!range) {
      return null;
    }
    const parsedRange = typeof range === 'object' ? range : JSON.parse(range) || null;
    return parsedRange;
  } catch {
    throw new Error(`Invalid range query syntax. Expected: [x,y], Received: ${range}`);
  }
};

/* Handles all the queries for searching in the database */
export const handleQueries = ({ query = {}, isUsingMainKey, baseUrl }) => {
  const {
    keyword = '',
    page: pageQuery = 0,
    range: rangeQuery = '',
    filter: filterQuery,
    strict: strictQuery,
    dialects: dialectsQuery,
    examples: examplesQuery,
    isStandardIgbo,
    pronunciation,
    nsibidi,
  } = query;
  const version = baseUrl.endsWith(Versions.VERSION_2) ? Versions.VERSION_2 : Versions.VERSION_1;
  const filter = convertFilterToKeyword(filterQuery);
  const searchWord = removePrefix(keyword || filter || '');
  const regexKeyword = constructRegexQuery({ isUsingMainKey, searchWord });
  const page = parseInt(pageQuery, 10);
  const range = parseRange(rangeQuery);
  const { skip, limit } = convertToSkipAndLimit({ page, range });
  const strict = strictQuery === 'true';
  const dialects = dialectsQuery === 'true';
  const examples = examplesQuery === 'true';
  return {
    version,
    searchWord,
    regexKeyword,
    page,
    skip,
    limit,
    strict,
    dialects,
    examples,
    isUsingMainKey,
    wordFields: {
      isStandardIgbo,
      pronunciation,
      nsibidi,
    },
  };
};
