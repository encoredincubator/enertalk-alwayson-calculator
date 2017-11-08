const axios = require('axios');
const EnerTalkAPIClient = require('enertalk-api-client');
const moment = require('moment-timezone');

class AlwaysOnCalculator {
  static validateDefaultOption(option) {
    const {
      apiClient,
      accessToken,
      baseTime,
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

  static validateCalculationOption(option) {
    const {
      baseTime,
      siteHash,
    } = option;

    if (!baseTime) {
      throw new Error('\'baseTime\' is required');
    }

    if (!(baseTime instanceof Date) && !(baseTime instanceof moment) && !isFinite(baseTime)) {
      throw new Error('\'baseTime\' should be a timestamp or a moment instance');
    }

    if (!siteHash || typeof siteHash !== 'string') {
      throw new Error('\'siteHash\' is required');
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

    if (Array.isArray(items)) {
      return items;
    }

    return [];
  }

  static filterSleepTime(items, timezone) {
    const start = 22;
    const end = 6;
    const filtered = items.filter(({ timestamp }) => {
      const hour = moment.tz(timestamp, timezone).hour();
      return hour >= start || hour < end;
    });

    return filtered;
  }

  static findConsistentItems(items) {
    // Find items which has consistent usage with a variation of 1Wh
    const tolerance = 1000;
    const getDiff = (a, b) => Math.abs(a - b);
    let consistentItems = [];
    let consistentItemsInProcessing = [];

    items.forEach(({ usage }) => {
      if (!consistentItemsInProcessing.length) {
        consistentItemsInProcessing.push(usage);
      } else if (consistentItemsInProcessing.length === 1) {
        const diff = getDiff(consistentItemsInProcessing[0], usage);

        if (diff <= tolerance) {
          consistentItemsInProcessing.push(usage);
        } else {
          consistentItemsInProcessing = [usage];
        }
      } else if (consistentItemsInProcessing.length === 2) {
        const min = Math.min(...consistentItemsInProcessing, usage);
        const max = Math.max(...consistentItemsInProcessing, usage);
        const diff = getDiff(min, max);

        if (diff <= tolerance) {
          consistentItemsInProcessing.push(usage);
        } else if (getDiff(consistentItemsInProcessing[1], usage)) {
          consistentItemsInProcessing = [consistentItemsInProcessing[1], usage];
        } else {
          consistentItemsInProcessing = [usage];
        }
      }

      if (consistentItemsInProcessing.length === 3) {
        consistentItems = [...consistentItemsInProcessing];
        consistentItemsInProcessing = [];
      }
    });

    return consistentItems;
  }

  static computeAverage(items) {
    const sum = items.reduce((a, b) => a + b, 0);
    const count = items.length;

    if (sum === 0) {
      return 0;
    }

    const average = sum / count;
    const parsedAverage = parseFloat(average.toFixed(2));

    return parsedAverage;
  }

  static runCalculation(data) {
    const items = AlwaysOnCalculator.pickItems(data);
    const filteredBySleepTime = AlwaysOnCalculator.filterSleepTime(items, this.timezone);
    const uniformItems = AlwaysOnCalculator.findConsistentItems(filteredBySleepTime);
    const average = AlwaysOnCalculator.computeAverage(uniformItems);

    return average;
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
  }

  getUsages(siteHash, periodOption) {
    return this.apiClient.periodicUsagesBySite(siteHash, periodOption)
      .then(response => response.data);
  }

  /*
      {Object} option: The option to setup ENERTALK API client
        - {Moment instance | Number} baseTime: (required) Base point to start querying data
        - {String} timezone: (optional) Default to 'US/Pacific'
        - {String} siteHash: (required) Target site to calculate
   */
  calculate(option = {}) {
    AlwaysOnCalculator.validateCalculationOption(option);

    const {
      siteHash,
      baseTime,
      timezone = 'US/Pacific',
    } = option;
    const periodOption = {
      start: moment.tz(baseTime, timezone).subtract(1, 'month').valueOf(),
      end: moment.tz(baseTime, timezone).valueOf(),
      period: '15min',
    };

    return this.getUsages(option.siteHash, periodOption)
      .then((data) => {
        const usage = AlwaysOnCalculator.runCalculation(data);

        return {
          start: periodOption.start,
          end: periodOption.end,
          period: '15min',
          siteHash,
          timezone,
          usage,
        };
      });
  }
}

module.exports = AlwaysOnCalculator;
module.exports['default'] = AlwaysOnCalculator;
