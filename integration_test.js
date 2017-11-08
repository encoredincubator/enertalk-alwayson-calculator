const moment = require('moment-timezone');
const AlwaysOnCalculator = require('./index');

// TODO(yongdamsh): Prompt user to enter access token and site hash
const option = {
  accessToken: '1e4ecafac2672c9edb417cd0941ba24caba597640b2f9d587ffb94f1b9357c65698c0b108275480fad671d83318fceb9e037a41c6ed025f0399e5a8ded0667fa',
};
const timezone = 'US/Pacific';
const setting = {
  siteHash: 'dab08974',
  baseTime: moment().tz(timezone),
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
