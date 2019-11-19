const fetch = require('node-fetch');
const fs = require('fs-extra')
const path = require('path')
const SDS011Client = require("sds011-client");

// read deviceId
let config = {}
if (fs.existsSync('/boot/config.json')) {
  config = fs.readJsonSync('/boot/config.json')
}

const body = {
  ip: process.env.IP || 'not_defined',
  deviceId: config.deviceId || 'not_defined'
}
 
fetch('https://macauiot.com/api/v1/air/online', {
  method: 'post',
  body:    JSON.stringify(body),
  headers: { 'Content-Type': 'application/json' },
})
  .then(res => res.json())
  .then(json => console.log(json));

const sensor = new SDS011Client(config.sds011Port || "/dev/ttyUSB0");
Promise
  .all([sensor.setReportingMode('active'), sensor.setWorkingPeriod(0)])
  .then(() => {
  });

sensor.on('reading', r => {
  console.log(r)
});
