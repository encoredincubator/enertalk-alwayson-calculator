const axios = require('axios');
const moment = require('moment-timezone');
const AlwaysOnCalculator = require('./index');
const config = require('./integration_config.json');

function run({ accessToken, siteHash }) {
  const option = {
    accessToken,
  };
  const timezone = 'US/Pacific';  // Change if needed
  const setting = {
    siteHash,
    baseTime: moment().tz(timezone),  // Change if needed
    timezone,
  };

  const instance = new AlwaysOnCalculator(option);

  // Use below method to use sleep time based filters
  //
  // instance.setFilters(
  //   AlwaysOnCalculator.sleepTimeFilter,
  //   AlwaysOnCalculator.consistentItemsFilter
  // );

  return instance.calculate(setting)
    .then((result) => {
      console.log(result);
      process.exit();
    })
    .catch((error) => {
      console.error(error.response);
      process.exit();
    });
}

if (!config.accessToken || !config.siteHash) {
  console.error('Please enter `accessToken` and `siteHash` in the `integration_config.json`');
  process.exit();
}

axios.get('https://auth.enertalk.com/verify', {
  headers: {
    Authorization: `Bearer ${config.accessToken}`,
  },
})
.catch(() => {
  console.error('Your `accessToken` is invalid. Please replace with another one');
  process.exit();
})
.then(() => {
  return axios.get(`https://api2.enertalk.com/sites/${config.siteHash}`, {
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
    },
  });
})
.catch(() => {
  console.error('Your `siteHash` is invalid. Please replace with another one');
  process.exit();
})
.then(() => run(config));
