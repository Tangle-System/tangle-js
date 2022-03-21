const DEBUG_LEVEL_NONE = 0;
const DEBUG_LEVEL_ERROR = 1;
const DEBUG_LEVEL_WARN = 2;
const DEBUG_LEVEL_INFO = 3;
const DEBUG_LEVEL_DEBUG = 4;
const DEBUG_LEVEL_VERBOSE = 5;

export const logging = {
  error: console.error,
  warn: function (...msg) {},
  info: function (...msg) {},
  debug: function (...msg) {},
  verbose: function (...msg) {},
};

export function setLoggingLevel(level) {
  logging.error = level >= 1 ? console.error : function (...msg) {};
  logging.warn = level >= 2 ? console.warn : function (...msg) {};
  logging.info = level >= 3 ? console.log : function (...msg) {};
  logging.debug = level >= 4 ? console.log : function (...msg) {};
  logging.verbose = level >= 5 ? console.log : function (...msg) {};
}