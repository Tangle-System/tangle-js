const DEBUG_LEVEL_NONE = 0;
const DEBUG_LEVEL_ERROR = 1;
const DEBUG_LEVEL_WARN = 2;
const DEBUG_LEVEL_INFO = 3;
const DEBUG_LEVEL_DEBUG = 4;
const DEBUG_LEVEL_VERBOSE = 5;

const loggingLevel = DEBUG_LEVEL_DEBUG;

export const logging = {
  error: console.error,
  warn: function () {},
  info: function () {},
  debug: function () {},
  verbose: function () {},
};

export function setLoggingLevel(level) {
  logging.error = level >= 1 ? console.error : function () {};
  logging.warn = level >= 2 ? console.warn : function () {};
  logging.info = level >= 3 ? console.log : function () {};
  logging.debug = level >= 4 ? console.log : function () {};
  logging.verbose = level >= 5 ? console.log : function () {};
}
