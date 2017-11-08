const EnerTalkAPIClient = require('enertalk-api-client');
const moment = require('moment-timezone');
const AlwaysOnCalculator = require('./index');
const dataOfOneMonth = require('./fixtures/sample15minOfOneMonth.json');

test('throw error by option validation', () => {
  expect(() => new AlwaysOnCalculator()).toThrow();
  expect(() => new AlwaysOnCalculator({
    apiClient: null,
  })).toThrow();
  expect(() => new AlwaysOnCalculator({
    accessToken: '',
  })).toThrow();
});

test('pass the validation', () => {
  expect(() => new AlwaysOnCalculator({
    accessToken: 'abcd',
    baseTime: Date.now(),
  })).not.toThrow();
});

function createThenableMockFn() {
  return jest.fn().mockReturnValue(Promise.resolve());
}

function getInstance() {
  const option = {
    accessToken: 'abcd',
  };
  const instance = new AlwaysOnCalculator(option);
  return instance;
}

test('throw error by missing baseTime', () => {
  const instance = getInstance();
  expect(() => instance.calculate({
    baseTime: null,
  })).toThrow();
});

test('throw error by missing siteHash', () => {
  const instance = getInstance();
  expect(() => instance.calculate({
    baseTime: new Date(),
    siteHash: null,
  })).toThrow();
});

test('period option', () => {
  const instance = getInstance();

  instance.getUsages = createThenableMockFn();
  instance.calculate({
    siteHash: 'site',
    baseTime: moment.tz('2017-11-01', 'US/Pacific'),
    timezone: 'US/Pacific',
  });

  expect(instance.getUsages).toBeCalledWith('site', expect.objectContaining({
    start: expect.any(Number),
    end: expect.any(Number),
    period: '15min',
  }));
});

describe('calculation logic', () => {
  test('pickItems', () => {
    expect(AlwaysOnCalculator.pickItems({ items: null })).toEqual([]);
    expect(AlwaysOnCalculator.pickItems({ items: [1, 2, 3] })).toEqual([1, 2, 3]);

    const usages = [
      { timestamp: 1, usage: 100 },
      { timestamp: 2, usage: 200 },
      { timestamp: 3, usage: 300 },
    ];
    expect(AlwaysOnCalculator.pickItems({ items: usages })).toEqual(usages);
  });

  test('filterSleepTime', () => {
    const timezone = 'Asia/Seoul';
    const items = [
      { timestamp: moment.tz('2017-11-08 14:00', timezone).valueOf() },
      { timestamp: moment.tz('2017-11-08 15:00', timezone).valueOf() },
      { timestamp: moment.tz('2017-11-08 20:59', timezone).valueOf() },
      { timestamp: moment.tz('2017-11-08 22:01', timezone).valueOf() }, // included
      { timestamp: moment.tz('2017-11-08 05:00', timezone).valueOf() }, // included
      { timestamp: moment.tz('2017-11-08 05:59', timezone).valueOf() }, // included
      { timestamp: moment.tz('2017-11-08 06:01', timezone).valueOf() },
    ];

    expect(AlwaysOnCalculator.filterSleepTime(items, timezone)).toEqual([
      { timestamp: moment.tz('2017-11-08 22:01', timezone).valueOf() }, // included
      { timestamp: moment.tz('2017-11-08 05:00', timezone).valueOf() },
      { timestamp: moment.tz('2017-11-08 05:59', timezone).valueOf() },
    ]);
  });

  test('filterSleepTime with actual data', () => {
    const timezone = 'US/Pacific';

    // The fixture is October, 2017
    // (8 hours * 4 quarter) items * 31 days = 992
    expect(AlwaysOnCalculator.filterSleepTime(dataOfOneMonth, timezone).length).toBe(992);
  });

  test('find consistent usages more than 3 consecutive times', () => {
    const items = [
      { timestamp: 1, usage: 1000 },
      { timestamp: 2, usage: 3000 },
      { timestamp: 3, usage: 4000 }, // consistent
      { timestamp: 3, usage: 4500 }, // consistent
      { timestamp: 5, usage: 4990 }, // consistent
      { timestamp: 6, usage: 5000 },
      { timestamp: 7, usage: 6000 },
    ];

    expect(AlwaysOnCalculator.findConsistentItems(items)).toEqual([4000, 4500, 4990]);
  });

  test('computeAverage', () => {
    const items = [4000, 4500, 4990];
    const expected = (4000 + 4500 + 4990) / 3;

    expect(AlwaysOnCalculator.computeAverage(items)).toBeCloseTo(expected);
  });
});
