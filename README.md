# servicenow-lite [![npm version](https://badge.fury.io/js/servicenow-lite.svg)](https://badge.fury.io/js/servicenow-lite)

This package provides convenience functions for accessing the SOAP API
provided by servicenow websites.

It's primarily used by [hubot-servicenow-tickets](https://github.com/manahl/hubot-servicenow-tickets).

License: MIT

## API

* recordId
* getRecordById
* recordsCreatedBy
* workNotesBySysId
* createTicket
* search
* userId

We also provide a `config` module that extracts data from servicenow.yaml.

## Usage

We assume that you've set environment variables for username and
password:

```
$ export HUBOT_SERVICENOW_USER='myusername'
$ export HUBOT_SERVICENOW_PASSWORD='secretpassword'
```

Next, you'll want a servicenow.yaml in the root of your project:

```
$ cat ./servicenow.yaml
root_url: https://servicenow.example.com
tables:
  - name: "change_request"
    prefix: "CR"
```

You can now make requests. Assuming you have a ticket called CR1234:

``` javascript
var api = require('servicenow-lite');

api.getRecordById('CR1234', function(err, details) {
  if (err) {
    console.error(err);
  } else {
    console.log(details)
  }
});
```
