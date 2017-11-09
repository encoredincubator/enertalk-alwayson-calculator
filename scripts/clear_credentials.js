const fs = require('fs');
const path = require('path');

const configFilePath = path.join(__dirname, '../integration_config.json');
const emptyConfig = JSON.stringify({
  accessToken: '',
  siteHash: '',
}, null, 2);

try {
  const configString = fs.readFileSync(configFilePath, {
    encoding: 'utf8',
  });
  const config = JSON.parse(configString);

  if (config.accessToken || config.siteHash) {
    fs.writeFileSync(configFilePath, emptyConfig);
  }
} catch (error) {
  if (error.code === 'ENOENT') {
    fs.writeFileSync(configFilePath, emptyConfig);
  }
}
