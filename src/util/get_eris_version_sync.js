const path = require('path');
const fs = require('fs');

function getErisVersionSync() {
  const indexPath = require.resolve('eris');
  const packagePath = path.join(path.dirname(indexPath), 'package.json');
  const package = JSON.parse(fs.readFileSync(packagePath));

  return package.version;
}

module.exports = getErisVersionSync
