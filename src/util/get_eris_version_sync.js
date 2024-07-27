const path = require('path');
const fs = require('fs');

function getErisVersionSync() {
  const indexPath = require.resolve('@projectdysnomia/dysnomia');
  const packagePath = path.join(path.dirname(indexPath), 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath));

  return packageJson.version;
}

module.exports = getErisVersionSync
