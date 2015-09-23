import bunyan from 'bunyan';

const appLog = bunyan.createLogger({name: 'app', level: 'trace'});

function log(level) {
  return (...args) => {
    if (typeof appLog[level] !== 'function') {
      throw new Error(`${level} not supported`);
    }
    appLog[level].apply(appLog, args);
  };
}


export default {
  verbose: log('trace'),
  debug: log('debug'),
  info: log('info'),
  warn: log('warn'),
  error: log('error'),
};
