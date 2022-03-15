const DEBUG_LEVEL_NONE = 0;
const DEBUG_LEVEL_ERROR = 1;
const DEBUG_LEVEL_WARN = 2;
const DEBUG_LEVEL_INFO = 3;
const DEBUG_LEVEL_DEBUG = 4;
const DEBUG_LEVEL_VERBOSE = 5;

const loggingLevel = DEBUG_LEVEL_DEBUG;

export const logging = {
  error: loggingLevel >= 1 ? console.error : function () {},
  warn: loggingLevel >= 2 ? console.warn : function () {},
  info: loggingLevel >= 3 ? console.log : function () {},
  debug: loggingLevel >= 4 ? console.log : function () {},
  verbose: loggingLevel >= 5 ? console.log : function () {},
};
