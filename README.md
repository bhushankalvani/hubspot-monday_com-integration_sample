# HubSpot and Monday.com Integration example

## Project Structure
```
hubspot-monday-com-integration#v1.0.0
├── index.js            # server entry point
└── package.json
```

## Installation

### Setup

``` bash
# clone the repo
$ git clone https://github.com/bhushankalvani/hubspot-monday_com-integration_sample.git hubspot-monday-com-integration

# go into app's directory
$ cd hubspot-monday-com-integration/

# install app's dependencies
$ npm install

# basic usage
$ npm start 
# or 
$ node index.js
```

## Design Reflection

1. How would you verify webhook authenticity in production?
We can do it 2 ways: Whitelist the webhooks (domains) and if we don't want to do that, we can check for the Authorization header we receive with each request to check the JWT validity using the HubSpot secret key that we have stored in the environment using probably `.env` setup or in memory.  

2. What is your approach to ensure idempotency if the webhook is received multiple times?
We can create a hash for the event Id, store it in database like redis to check if the request has already been received. If it has been then ignore the current request. This is keeping in mind that the event id is the same for events received. For different events it wouldn't make a difference. We can use `node:crypto` module to check for this by creating a hash and storing it in database then processing the request

3. How would you handle API rate limits effectively?
There are again 2 ways we can do this. 1) we can rely on the 429 status code which is provided by Monday.com or HubSpot or equivalent error message which is basically "Too many requests" and process it respond to the user, store the request in the caching or our database and run a queue against it. 2) Setup our own ratelimiter middleware which prevents hitting the core Monday.com or HubSpot APIs and use it against our own API and check against cached entries in our database.