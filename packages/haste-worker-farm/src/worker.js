const { fork } = require('child_process');
const { parseError } = require('./worker-bin');

const WORKER_BIN = require.resolve('./worker-bin');
const WORKER_OPTIONS = {
  silent: false,
  env: {
    FORCE_COLOR: true,
    ...process.env
  }
};

module.exports = class Worker {
  constructor({ pool }) {
    this.pool = pool;
    this.busy = false;
    this.promise = null;

    this.initialize();
  }

  initialize() {
    this.child = fork(WORKER_BIN, WORKER_OPTIONS);

    this.child.on('message', (...args) => this.receive(...args));

    this.child.send({
      type: 'CHILD_MESSAGE_INITIALIZE',
      options: {
        modulePath: this.pool.modulePath,
      },
    });
  }

  send({ options }) {
    if (this.busy) {
      throw new Error('Unexpected request to a busy worker');
    }

    this.busy = true;

    return new Promise((resolve, reject) => {
      this.promise = { resolve, reject };
      this.child.send({ type: 'CHILD_MESSAGE_CALL', options });
    });
  }

  receive({ type, result, error }) {
    switch (type) {
      case 'PARENT_MESSAGE_COMPLETE':
        this.busy = false;
        this.promise.resolve(result);
        break;

      case 'PARENT_MESSAGE_IDLE':
        this.promise.resolve(result);
        break;

      case 'PARENT_MESSAGE_ERROR':
        this.busy = false;
        this.promise.reject(parseError(error));
        break;

      default:
        throw new Error('Unexpected response from worker');
    }
  }
};
