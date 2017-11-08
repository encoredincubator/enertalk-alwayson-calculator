const moment = require('moment-timezone');
const AlwaysOnCalculator = require('./index');

// TODO(yongdamsh): Prompt user to enter access token and site hash
const option = {
  accessToken: '',
};
const timezone = 'US/Pacific';  // Change if needed
const setting = {
  siteHash: '',
  baseTime: moment().tz(timezone),  // Change if needed
  timezone,
};

if (!option.accessToken || !setting.siteHash) {
  console.error('Please enter `accessToken` and `siteHash` to test');
  process.exit();
}

const instance = new AlwaysOnCalculator(option);

return instance.calculate(setting)
  .then((result) => {
    console.log(result);
    process.exit();
  })
  .catch((error) => {
    console.error(error.response);
    process.exit();
  });
