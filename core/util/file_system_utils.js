const reload = require('require-reload')(require);
const fs = require('fs');

function getFilesInDirectory(directory) {
  return new Promise((fulfill, reject) => {
    let filePaths = [];
    fs.readdir(directory, (err, files) => {
      if (err) {
        reject(err);
      } else {
        for (let j = 0; j < files.length; ++j) {
          filePaths.push(directory + '/' + files[j]);
        }
      }

      fulfill(filePaths);
    });
  });
}

module.exports = {
  getFilesInDirectory,
};
