const EnerTalkAPIClient = require('enertalk-api-client/build');
const moment = require('moment-timezone');

class AlwaysOnCalculator {
  static validateDefaultOption(option) {
    const {
      apiClient,
      accessToken,
    } = option;

    if (!apiClient && !accessToken) {
      throw new Error('One of option \'apiClient\' or \'accessToken\' is required');
    }

    if (apiClient && !(apiClient instanceof EnerTalkAPIClient)) {
      throw new Error('\'apiClient\' option should be an instance of EnerTalkAPIClient');
    }

    if (accessToken && typeof accessToken !== 'string') {
      throw new Error('\'accessToken\' option should be a string');
    }
  }

  static validateCalculationSetting(option) {
    const {
      baseTime,
      siteHash,
    } = option;

    if (baseTime && !(baseTime instanceof Date || baseTime instanceof moment || isFinite(baseTime))) {
      throw new Error('\'baseTime\' should be a timestamp, Date or a moment instance');
    }

    if (!siteHash || typeof siteHash !== 'string') {
      throw new Error('\'siteHash\' is required');
    }
  }

  static validateFilter(filterFn) {
    const testSetting = {
      baseTime: moment(),
      timezone: 'US/Pacific',
    };

    if (!Array.isArray(filterFn([], testSetting))) {
      throw new Error('filter should return an array');
    }
  }

  static getInstance(option) {
    const {
      apiClient,
      accessToken,
    } = option;

    if (apiClient) {
      return apiClient;
    }

    return new EnerTalkAPIClient({ accessToken });
  }

  static pickItems(data = {}) {
    const { items } = data;

    if (!Array.isArray(items)) {
      return [];
    }

    return items.filter(({ usage }) => usage > 0);
  }

  // Built-in filters
  static minimumDailyUsageFilter(items, config) {
    const { timezone } = config;
    let minimumDailyUsages = [];
    let minimumOfCurrentDay;

    items.forEach((item, index) => {
      if (!minimumOfCurrentDay) {
        minimumOfCurrentDay = item;
        return;
      }

      const isSameDay = moment.tz(minimumOfCurrentDay.timestamp, timezone)
        .isSame(moment.tz(item.timestamp, timezone), 'day');

      if (isSameDay && item.usage < minimumOfCurrentDay.usage) {
        minimumOfCurrentDay = item;
      } else if (index === items.length - 1) {
        minimumDailyUsages.push(minimumOfCurrentDay);
      } else if (!isSameDay) {
        minimumDailyUsages.push(minimumOfCurrentDay);
        minimumOfCurrentDay = item;
      }
    });

    return minimumDailyUsages;
  }

  static sleepTimeFilter(items, config) {
    const { timezone } = config;
    const start = 22;
    const end = 6;
    const filtered = items.filter(({ timestamp }) => {
      const hour = moment.tz(timestamp, timezone).hour();
      return hour >= start || hour < end;
    });

    return filtered;
  }

  static consistentItemsFilter(items) {
    // Find items which has consistent usage with a variation of 1Wh
    const tolerance = 1000;
    const getDiff = (a, b) => Math.abs(a - b);
    let consistentItems = [];
    let consistentItemsInProcessing = [];

    items.forEach((item, index) => {
      if (!consistentItemsInProcessing.length) {
        consistentItemsInProcessing = [item];
      } else {
        const diff = getDiff(consistentItemsInProcessing[0].usage, item.usage);

        if (diff <= tolerance) {
          consistentItemsInProcessing.push(item);

          if (index === items.length - 1 && consistentItemsInProcessing.length >= 3) {
            consistentItems = [...consistentItemsInProcessing];
          }
        } else {
          if (consistentItemsInProcessing.length >= 3) {
            consistentItems = [...consistentItemsInProcessing];
          }

          consistentItemsInProcessing = [item];
        }
      }
    });

    return consistentItems;
  }

  static computeAverage(items) {
    const sum = items.map(({ usage }) => usage).reduce((a, b) => a + b, 0);
    const count = items.length;

    if (sum === 0) {
      return 0;
    }

    const average = sum / count;
    const parsedAverage = parseFloat(average.toFixed(2));

    return parsedAverage;
  }

  /*
      {Object} option: The option to setup ENERTALK API client
        - {EnerTalkAPIClient} apiClient: An api client instance that caller already has
        - {String} accessToken: ENERTALK OAuth access token for instance initialization

        NOTE: One of 'apiClient' and 'accessToken' must exist, or it throws an error
   */
  constructor(option = {}) {
    AlwaysOnCalculator.validateDefaultOption(option);

    this.apiClient = AlwaysOnCalculator.getInstance(option);
    this.filters = [];
    this.setFilters(AlwaysOnCalculator.minimumDailyUsageFilter);

    this.setFilters = this.setFilters.bind(this);
    this.calculate = this.calculate.bind(this);
  }

  /*
      Each filter should have a function signiture as following,
      ([UsageItem], Setting) => [UsageItem]

      {Object} UsageItem
        - {Number} timestamp
        - {Number} usage
      {Object} Setting
        - {Moment instance | Number} baseTime: (required) Base point to start querying data
        - {String} timezone: (optional) Default to 'US/Pacific'
   */
  setFilters(...filters) {
    if (Array.isArray(filters[0])) {
      return this.setFilters(...filters[0]);
    }

    filters.forEach((fn) => {
      AlwaysOnCalculator.validateFilter(fn);
    });

    this.filters = filters.map(fn => function wrappedFilter(items, config) {
      return fn(items, config);
    });
  }

  getTimezone(siteHash, timezone) {
    if (timezone) {
      return Promise.resolve(timezone);
    }

    return this.apiClient.getSite(siteHash)
      .then(response => response.data.timezone);
  }

  getUsages(siteHash, periodOption) {
    return this.apiClient.periodicUsagesBySite(siteHash, periodOption)
      .then(response => response.data);
  }

  runCalculation(items, setting) {
    const filteredItems = this.filters.reduce((itemsInFiltering, filterFn) =>
      filterFn(itemsInFiltering, setting), items);
    const average = AlwaysOnCalculator.computeAverage(filteredItems);

    return average;
  }

  /*
      {Object} option: The option to setup ENERTALK API client
        - {Moment instance | Date instance | Number} baseTime: (required) Base point to start querying data
        - {String} timezone: (optional) Default to 'US/Pacific'
        - {String} siteHash: (required) Target site to calculate
   */
  calculate(setting = {}) {
    AlwaysOnCalculator.validateCalculationSetting(setting);

    const {
      siteHash,
      timezone,
      baseTime,
    } = setting;

    return this.getTimezone(siteHash, timezone)
      .then((timezone) => {
        const baseTimeAsDate = baseTime ? moment.tz(baseTime, timezone) :
          moment().tz(timezone);
        const periodOption = {
          start: baseTimeAsDate.clone().subtract(1, 'month').valueOf(),
          end: baseTimeAsDate.valueOf(),
          period: '15min',
        };

        return this.getUsages(siteHash, periodOption);
      })
      .then((data) => {
        const items = AlwaysOnCalculator.pickItems(data);
        const period = '15min';

        // 15min data count is less than 7 days
        if (items.length < 96 * 7) {
          return {
            start: null,
            end: null,
            period,
            usage: 0,
          };
        }

        const start = items[0].timestamp;
        const end = items[items.length - 1].timestamp + 900000;
        const usage = this.runCalculation(items, setting);

        return {
          start,
          end,
          period,
          usage,
        };
      })
      .catch((error) => {
        if (error.response) {
          return Promsie.reject(error.response.data);
        }

        if (error.message) {
          return Promise.reject(error.message);
        }

        return Promise.reject(new Error(error || 'unknown'));
      });
  }
}

module.exports = AlwaysOnCalculator;
module.exports['default'] = AlwaysOnCalculator;
