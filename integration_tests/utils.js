/**
 * Copyright 2017-present, Callstack.
 * All rights reserved.
 *
 * Based on Jest: https://github.com/facebook/jest/blob/master/integration_tests/utils.js
 *
 * @flow
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const mkdirp = require('mkdirp');
const rimraf = require('rimraf');
const http = require('http');

const run = (cmd: string, cwd?: string) => {
  const args = cmd.split(/\s/).slice(1);
  const spawnOptions = { cwd };
  const result = spawnSync(cmd.split(/\s/)[0], args, spawnOptions);

  if (result.status !== 0) {
    const message = `
      ORIGINAL CMD: ${cmd}
      STDOUT: ${result.stdout && result.stdout.toString()}
      STDERR: ${result.stderr && result.stderr.toString()}
      STATUS: ${result.status}
      ERROR: ${result.error && result.error.toString()}
    `;
    throw new Error(message);
  }

  result.stdout = result.stdout && result.stdout.toString();
  result.stderr = result.stderr && result.stderr.toString();

  return result;
};

const fileExists = (filePath: string) => {
  try {
    fs.accessSync(filePath, fs.F_OK);
    return true;
  } catch (e) {
    return false;
  }
};

const cleanup = (directory: string) => rimraf.sync(directory);

/**
 * Creates a nested directory with files and their contents
 * writeFiles(
 *   '/home/tmp',
 *   {
 *     'package.json': '{}',
 *     '__tests__/test.test.js': 'test("lol")',
 *   }
 * );
 */
const writeFiles = (
  directory: string,
  files: { [filename: string]: string }
) => {
  mkdirp.sync(directory);
  Object.keys(files).forEach(fileOrPath => {
    const filePath = fileOrPath.split(path.sep); // ['tmp', 'a.js']
    const filename = filePath.pop(); // filepath becomes dirPath (no filename)

    if (filePath.length) {
      mkdirp.sync(path.join(...[directory, ...filePath]));
    }
    fs.writeFileSync(
      path.resolve(...[directory, filename, ...filePath]),
      files[fileOrPath]
    );
  });
};

const copyDir = (src: string, dest: string) => {
  const srcStat = fs.lstatSync(src);
  if (srcStat.isDirectory()) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest);
    }
    fs.readdirSync(src).map(filePath => {
      return copyDir(path.join(src, filePath), path.join(dest, filePath));
    });
  } else {
    fs.writeFileSync(dest, fs.readFileSync(src));
  }
};

const DEFAULT_PACKAGE_JSON = {
  description: 'THIS IS AN AUTOGENERATED FILE AND SHOULD NOT BE ADDED TO GIT',
};

const createEmptyPackage = (
  directory: string,
  packageJson: Object = DEFAULT_PACKAGE_JSON
) => {
  mkdirp.sync(directory);

  fs.writeFileSync(
    path.resolve(directory, 'package.json'),
    JSON.stringify(packageJson, null, 2)
  );
};

function replaceTestPath(string: string) {
  return string.replace(/^\W+(.*)integration_tests/gm, '<<REPLACED>>');
}

function fetchBundle(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    http.get(url, response => {
      if (response.statusCode !== 200) {
        reject(response.statusCode);
      } else {
        let body = '';
        response.setEncoding('utf8');
        response.on('data', chunk => {
          body += chunk;
        });
        response.on('end', () => {
          resolve(body);
        });
      }
    });
  });
}

module.exports = {
  cleanup,
  copyDir,
  createEmptyPackage,
  fileExists,
  run,
  writeFiles,
  replaceTestPath,
  fetchBundle,
};
