const path = require('path');
const Jasmine = require('jasmine');

const clearRequireCache = () => {
  Object.keys(require.cache)
    .filter(key => !key.includes('node_modules'))
    .forEach(key => delete require.cache[key]);
};

module.exports = ({ config, reportersPath }) => async (files) => {
  const jasmineRunner = new Jasmine();

  if (config) {
    jasmineRunner.loadConfig(config);
  }

  if (reportersPath) {
    const repoters = require(reportersPath);

    repoters.forEach((repoter) => {
      jasmineRunner.addReporter(repoter);
    });
  }

  files.forEach(({ filename, cwd }) => {
    jasmineRunner.addSpecFile(path.isAbsolute(filename) ? filename : path.join(cwd, filename));
  });

  const result = new Promise((resolve, reject) => {
    jasmineRunner.onComplete(passed => passed ? resolve() : reject());
  });

  jasmineRunner.execute();

  return result
    .then(clearRequireCache);
};
