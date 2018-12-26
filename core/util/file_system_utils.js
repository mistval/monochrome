const fs = require('fs');
const path = require('path');

function getFilesInDirectory(directory) {
  const fileNames = fs.readdirSync(directory);
  return fileNames.map(fileName => path.join(directory, fileName));
}

module.exports = {
  getFilesInDirectory,
};
