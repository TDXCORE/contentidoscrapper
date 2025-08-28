export class Logger {
  constructor(name) {
    this.name = name;
    this.levels = {
      DEBUG: 0,
      INFO: 1,
      WARN: 2,
      ERROR: 3
    };
    this.currentLevel = this.levels.INFO;
  }

  setLevel(level) {
    if (typeof level === 'string') {
      this.currentLevel = this.levels[level.toUpperCase()] ?? this.levels.INFO;
    } else {
      this.currentLevel = level;
    }
  }

  formatMessage(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${this.name}] [${level}]`;
    
    if (data) {
      return `${prefix} ${message} ${JSON.stringify(data)}`;
    }
    return `${prefix} ${message}`;
  }

  debug(message, data = null) {
    if (this.currentLevel <= this.levels.DEBUG) {
      console.debug(this.formatMessage('DEBUG', message, data));
    }
  }

  info(message, data = null) {
    if (this.currentLevel <= this.levels.INFO) {
      console.info(this.formatMessage('INFO', message, data));
    }
  }

  warn(message, data = null) {
    if (this.currentLevel <= this.levels.WARN) {
      console.warn(this.formatMessage('WARN', message, data));
    }
  }

  error(message, data = null) {
    if (this.currentLevel <= this.levels.ERROR) {
      console.error(this.formatMessage('ERROR', message, data));
    }
  }
}