const fetch = require('node-fetch');
const fs = require('fs-extra')
const path = require('path')
const SDS011Client = require("sds011-client");
var winston = require('winston');
require('winston-daily-rotate-file');

var transport = new (winston.transports.DailyRotateFile)({
  filename: 'app-%DATE%.log',
  datePattern: 'YYYY-MM-DD-HH',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '14d'
});

var logger = winston.createLogger({
  transports: [
    transport
  ]
});

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
  .then(json => {
    console.log(json)
    logger.info(JSON.stringify(json));
  });

const sensor = new SDS011Client(config.sds011Port || "/dev/ttyUSB0");
Promise
  .all([sensor.setReportingMode('active'), sensor.setWorkingPeriod(0)])
  .then(() => {
  });

sensor.on('reading', r => {
  console.log(r)
  logger.info(JSON.stringify(r));
});

const SerialPort = require("serialport");
const SerialPortParser = require("@serialport/parser-readline");
const GPS = require("gps");

const port = new SerialPort("/dev/ttyACM0", { baudRate: 9600 });
const gps = new GPS();
const parser = port.pipe(new SerialPortParser());

function getAddressInformation(latitude, longitude) {
  logger.info(JSON.stringify({ latitude, longitude }));
}
gps.on("data", async data => {
  if(data.type == "GGA") {
      if(data.quality != null) {
          let address = await getAddressInformation(data.lat, data.lon);
          console.log(" [" + data.lat + ", " + data.lon + "]");
          logger.info(" [" + data.lat + ", " + data.lon + "]");
      } else {
          console.log("no gps fix available");
          logger.info("no gps fix available");
      }
  }
});
parser.on("data", data => {
  try {
      gps.update(data);
  } catch (e) {
      throw e;
  }
});