# enertalk-alwayson-calculator
[Experimental] 'Always on' calculator based on 15 minute data

## How to use

### Installation
Install 'enertalk-alwayson-calculator' package via NPM or Yarn.
```sh
> npm install enertalk-alwayson-calculator
or
> yarn add enertalk-alwayson-calculator
```

### Initialize the calculator
- Import the package

```js
const AlwaysOnCalculator = require('enertalk-alwayson-calculator');
```

- Create a new instance with option

```js
const instance = new AlwaysOnCalculator({
  accessToken: 'yourAccessToken'
});

// or inject existing API client instance
const myClient = new EnerTalkAPIClient({ ... });
const instance = new AlwaysOnCalculator({
  apiClient: myClient,
});
```

If you need more details about ENERTALK API client, see the [document](https://github.com/encoredincubator/enertalk-api-client)

### Execute the 'calculate' method with setting
- `siteHash` is required

```js
instance.calculate({
  siteHash: 'yourSiteHash',
  baseTime: Date.now(), // optional
  timezone: 'US/Pacific', // optional
});
```

> NOTE: The 'baseTime' is end of period for periodic usage API.  
> And start will be one month before the 'baseTime'.   
> - If the `baseTime` is not given, it has the current time as the default.  
> - If the `timezone` is not given, it will be retrieved by site hash you passed  


### Built-in filters
#### [`minimumDailyUsageFilter`](https://github.com/encoredincubator/enertalk-alwayson-calculator/blob/master/index.js#L74-L99)
It filters the average of the daily minimum values

#### [`sleepTimeFilter`](https://github.com/encoredincubator/enertalk-alwayson-calculator/blob/master/index.js#L101-L111)
It filters based on sleep time (22:00 ~ 06:00)

#### [`consistentItemsFilter`](https://github.com/encoredincubator/enertalk-alwayson-calculator/blob/master/index.js#L113-L153)
It filters that remain within 1Wh of fluctuation more than 3 times


### [Advanced] Use your own filters
By default, the calculator uses a filter named 'minimumDailyUsageFilter'.
The filter calculates an average of minimum usages of each day.

If you know more improved logic, you can replace the filter by using 'setFilters' method.
The custom filter function should conform a following input/output signiture

```
([UsageItem], Setting) => [UsageItem]

input: array of UsageItem  
output: array of filtered UsageItem

And types are below,  

{Object} UageItem  
  - {Number} timestamp
  - {Number} usage

{Object} Setting  
  - {String} timezone
```

 Set mutiple filters as follows,
 ```js
 const customFilter1 = (items, setting) => items.filter(...);
 const customFilter2 = (items, setting) => items.filter(...);

 instance.setFilters(customFilter1, customFilter2, ...)
 ```


 ## How to test
 To test this package, clone this repository on your local

 ### Run unit tests

 ```sh
 > yarn test
 ```

 ### Run integration test

 ```sh
 yarn calculate
 ```

 > NOTE: To execute the integration test normally, you need to obtain `accessToken`  and `siteHash` first.
