const fetch = require('node-fetch');
const fs = require('fs-extra')
const path = require('path')

// read deviceId
let config
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
