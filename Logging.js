export const DEBUG_LEVEL_NONE = 0;
export const DEBUG_LEVEL_ERROR = 1;
export const DEBUG_LEVEL_WARN = 2;
export const DEBUG_LEVEL_INFO = 3;
export const DEBUG_LEVEL_DEBUG = 4;
export const DEBUG_LEVEL_VERBOSE = 5;

export const logging = {
  error: console.error,
  warn: console.warn,
  info: console.log,
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

if (window) {
  window.DEBUG_LEVEL_NONE = DEBUG_LEVEL_NONE;
  window.DEBUG_LEVEL_ERROR = DEBUG_LEVEL_ERROR;
  window.DEBUG_LEVEL_WARN = DEBUG_LEVEL_WARN;
  window.DEBUG_LEVEL_INFO = DEBUG_LEVEL_INFO;
  window.DEBUG_LEVEL_DEBUG = DEBUG_LEVEL_DEBUG;
  window.DEBUG_LEVEL_VERBOSE = DEBUG_LEVEL_VERBOSE;

  window.setLoggingLevel = setLoggingLevel;
}
