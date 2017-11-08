# enertalk-alwayson-calculator
[Experimental] 'Always on' calculator based on 15 minute data

## How to use

### Installation
Install 'enertalk-alwayson-calculator' package via NPM or Yarn.


### Initialize the calculator
- Import the package
- Create a new instance with option

> NOTE: You can use existing ENERTALK API client instance.   
> To use it, just pass a 'apiClient' option   


### Execute the 'calculate' method with setting
- 'baseTime' and 'siteHash' is required

> NOTE: The 'baseTime' is end of period for periodic usage API.  
> And start will be one month before the 'baseTime'.   


### [Advanced] Use your own filters
By default, the calculator uses a filter named 'minimumDailyUsageFilter'.
The filter calculates an average of minimum usages of each day.

If you know more improved logic, you can replace the filter by using 'setFilters' method.
The custom filter function should conform a following input/output signiture

([UsageItem], Setting) => [UsageItem]

input: array of UsageItem  
output: array of filtered UsageItem

And each parameter's type is,  
{Object} UageItem  
  - {Number} timestamp
  - {Number} usage
{Object} Setting  
  - {String} timezone
  
  
 Set mutiple filters as follows,
 
 calculator.setFilters(customFilter1, customFilter2, ...)
 
 
 ## How to test
 To test this package, clone this repository on your local
 
 ### Run unit tests
 yarn test
 
 ### Run integration test
 yarn calculate
 
 > NOTE: 'accessToken' and 'siteHash' should be fulfilled in the 'integration_test.js' file  
 
 
