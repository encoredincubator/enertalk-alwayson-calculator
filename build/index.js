'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var EnerTalkAPIClient = require('enertalk-api-client/build');
var moment = require('moment-timezone');

var AlwaysOnCalculator = function () {
  _createClass(AlwaysOnCalculator, null, [{
    key: 'validateDefaultOption',
    value: function validateDefaultOption(option) {
      var apiClient = option.apiClient,
          accessToken = option.accessToken;


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
  }, {
    key: 'validateCalculationSetting',
    value: function validateCalculationSetting(option) {
      var baseTime = option.baseTime,
          siteHash = option.siteHash;


      if (baseTime && !(baseTime instanceof Date || baseTime instanceof moment || isFinite(baseTime))) {
        throw new Error('\'baseTime\' should be a timestamp, Date or a moment instance');
      }

      if (!siteHash || typeof siteHash !== 'string') {
        throw new Error('\'siteHash\' is required');
      }
    }
  }, {
    key: 'validateFilter',
    value: function validateFilter(filterFn) {
      var testSetting = {
        baseTime: moment(),
        timezone: 'US/Pacific'
      };

      if (!Array.isArray(filterFn([], testSetting))) {
        throw new Error('filter should return an array');
      }
    }
  }, {
    key: 'getInstance',
    value: function getInstance(option) {
      var apiClient = option.apiClient,
          accessToken = option.accessToken;


      if (apiClient) {
        return apiClient;
      }

      return new EnerTalkAPIClient({ accessToken: accessToken });
    }
  }, {
    key: 'pickItems',
    value: function pickItems() {
      var data = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
      var items = data.items;


      if (!Array.isArray(items)) {
        return [];
      }

      return items.filter(function (_ref) {
        var usage = _ref.usage;
        return usage > 0;
      });
    }

    // Built-in filters

  }, {
    key: 'minimumDailyUsageFilter',
    value: function minimumDailyUsageFilter(items, config) {
      var timezone = config.timezone;

      var minimumDailyUsages = [];
      var minimumOfCurrentDay = void 0;

      items.forEach(function (item, index) {
        if (!minimumOfCurrentDay) {
          minimumOfCurrentDay = item;
          return;
        }

        var isSameDay = moment.tz(minimumOfCurrentDay.timestamp, timezone).isSame(moment.tz(item.timestamp, timezone), 'day');

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
  }, {
    key: 'sleepTimeFilter',
    value: function sleepTimeFilter(items, config) {
      var timezone = config.timezone;

      var start = 22;
      var end = 6;
      var filtered = items.filter(function (_ref2) {
        var timestamp = _ref2.timestamp;

        var hour = moment.tz(timestamp, timezone).hour();
        return hour >= start || hour < end;
      });

      return filtered;
    }
  }, {
    key: 'consistentItemsFilter',
    value: function consistentItemsFilter(items) {
      // Find items which has consistent usage with a variation of 1Wh
      var tolerance = 1000;
      var getDiff = function getDiff(a, b) {
        return Math.abs(a - b);
      };
      var consistentItems = [];
      var consistentItemsInProcessing = [];

      items.forEach(function (item, index) {
        if (!consistentItemsInProcessing.length) {
          consistentItemsInProcessing = [item];
        } else {
          var diff = getDiff(consistentItemsInProcessing[0].usage, item.usage);

          if (diff <= tolerance) {
            consistentItemsInProcessing.push(item);

            if (index === items.length - 1 && consistentItemsInProcessing.length >= 3) {
              consistentItems = [].concat(_toConsumableArray(consistentItemsInProcessing));
            }
          } else {
            if (consistentItemsInProcessing.length >= 3) {
              consistentItems = [].concat(_toConsumableArray(consistentItemsInProcessing));
            }

            consistentItemsInProcessing = [item];
          }
        }
      });

      return consistentItems;
    }
  }, {
    key: 'computeAverage',
    value: function computeAverage(items) {
      var sum = items.map(function (_ref3) {
        var usage = _ref3.usage;
        return usage;
      }).reduce(function (a, b) {
        return a + b;
      }, 0);
      var count = items.length;

      if (sum === 0) {
        return 0;
      }

      var average = sum / count;
      var parsedAverage = parseFloat(average.toFixed(2));

      return parsedAverage;
    }

    /*
        {Object} option: The option to setup ENERTALK API client
          - {EnerTalkAPIClient} apiClient: An api client instance that caller already has
          - {String} accessToken: ENERTALK OAuth access token for instance initialization
           NOTE: One of 'apiClient' and 'accessToken' must exist, or it throws an error
     */

  }]);

  function AlwaysOnCalculator() {
    var option = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

    _classCallCheck(this, AlwaysOnCalculator);

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


  _createClass(AlwaysOnCalculator, [{
    key: 'setFilters',
    value: function setFilters() {
      for (var _len = arguments.length, filters = Array(_len), _key = 0; _key < _len; _key++) {
        filters[_key] = arguments[_key];
      }

      if (Array.isArray(filters[0])) {
        return this.setFilters.apply(this, _toConsumableArray(filters[0]));
      }

      filters.forEach(function (fn) {
        AlwaysOnCalculator.validateFilter(fn);
      });

      this.filters = filters.map(function (fn) {
        return function wrappedFilter(items, config) {
          return fn(items, config);
        };
      });
    }
  }, {
    key: 'getTimezone',
    value: function getTimezone(siteHash, timezone) {
      if (timezone) {
        return Promise.resolve(timezone);
      }

      return this.apiClient.getSite(siteHash).then(function (response) {
        return response.data.timezone;
      });
    }
  }, {
    key: 'getUsages',
    value: function getUsages(siteHash, periodOption) {
      return this.apiClient.periodicUsagesBySite(siteHash, periodOption).then(function (response) {
        return response.data;
      });
    }
  }, {
    key: 'runCalculation',
    value: function runCalculation(items, setting) {
      var filteredItems = this.filters.reduce(function (itemsInFiltering, filterFn) {
        return filterFn(itemsInFiltering, setting);
      }, items);
      var average = AlwaysOnCalculator.computeAverage(filteredItems);

      return average;
    }

    /*
        {Object} option: The option to setup ENERTALK API client
          - {Moment instance | Date instance | Number} baseTime: (required) Base point to start querying data
          - {String} timezone: (optional) Default to 'US/Pacific'
          - {String} siteHash: (required) Target site to calculate
     */

  }, {
    key: 'calculate',
    value: function calculate() {
      var _this = this;

      var setting = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

      AlwaysOnCalculator.validateCalculationSetting(setting);

      var siteHash = setting.siteHash,
          timezone = setting.timezone,
          baseTime = setting.baseTime;


      return this.getTimezone(siteHash, timezone).then(function (timezone) {
        var baseTimeAsDate = baseTime ? moment.tz(baseTime, timezone) : moment().tz(timezone);
        var periodOption = {
          start: baseTimeAsDate.clone().subtract(1, 'month').valueOf(),
          end: baseTimeAsDate.valueOf(),
          period: '15min'
        };

        return _this.getUsages(siteHash, periodOption);
      }).then(function (data) {
        var items = AlwaysOnCalculator.pickItems(data);
        var period = '15min';

        // 15min data count is less than 7 days
        if (items.length < 96 * 7) {
          return {
            start: null,
            end: null,
            period: period,
            usage: 0
          };
        }

        var start = items[0].timestamp;
        var end = items[items.length - 1].timestamp + 900000;
        var usage = _this.runCalculation(items, setting);

        return {
          start: start,
          end: end,
          period: period,
          usage: usage
        };
      }).catch(function (error) {
        if (error.response) {
          return Promsie.reject(error.response.data);
        }

        if (error.message) {
          return Promise.reject(error.message);
        }

        return Promise.reject(new Error(error || 'unknown'));
      });
    }
  }]);

  return AlwaysOnCalculator;
}();

module.exports = AlwaysOnCalculator;
module.exports['default'] = AlwaysOnCalculator;