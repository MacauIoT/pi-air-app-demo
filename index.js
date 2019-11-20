/* global $V, $M */

const fetch = require('node-fetch')
const fs = require('fs-extra')
const SDS011Client = require('sds011-client')
const GPS = require('gps')
const winston = require('winston')
require('winston-daily-rotate-file')
const SerialPort = require('serialport')
const parsers = SerialPort.parsers
const Sylvester = require('sylvester')
const Kalman = require('kalman').KF

// setup logging
const transport = new (winston.transports.DailyRotateFile)({
  filename: 'app-%DATE%.log',
  datePattern: 'YYYY-MM-DD-HH',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '14d'
})
const logger = winston.createLogger({
  transports: [
    transport
  ]
})

// read config.json
let config = {}
try {
  if (fs.existsSync('/boot/config.json')) {
    config = fs.readJsonSync('/boot/config.json')
  }
} catch (error) {
  logger.info(error)
}

// online api call
fetch('https://macauiot.com/api/v1/air/online', {
  method: 'post',
  body: JSON.stringify({
    ip: process.env.IP || 'not_defined',
    deviceId: config.deviceId || 'not_defined'
  }),
  headers: { 'Content-Type': 'application/json' }
})
  .then(res => res.json())
  .then(json => {
    console.log(json)
    logger.info(JSON.stringify(json))
  })
  .catch(error => {
    console.log(error)
    logger.info(error)
  })

// setup sds011
const sensor = new SDS011Client(config.sds011Port || '/dev/ttyUSB0')
Promise
  .all([sensor.setReportingMode('active'), sensor.setWorkingPeriod(0)])
  .then(() => {
  })

let sds011Data = null
let sds011UpdatedAt = null
sensor.on('reading', r => {
  // log the sensor value
  console.log(r)
  logger.info(JSON.stringify(r))

  // update the state
  sds011Data = r
  sds011UpdatedAt = Date.now()
})

// setup gps
const parser = new parsers.Readline({
  delimiter: '\r\n'
})
const port = new SerialPort(config.gpsPort || '/dev/ttyACM0', {
  baudRate: 9600
})
port.pipe(parser)
const gps = new GPS()
// Simple Kalman Filter set up
var A = Sylvester.Matrix.I(2)
var B = Sylvester.Matrix.Zero(2, 2)
var H = Sylvester.Matrix.I(2)
var C = Sylvester.Matrix.I(2)
var Q = Sylvester.Matrix.I(2).multiply(1e-11)
var R = Sylvester.Matrix.I(2).multiply(0.00001)
// Measure
var u = $V([0, 0])
var filter = new Kalman($V([0, 0]), $M([[1, 0], [0, 1]]))

const last = null
gps.on('data', async data => {
  if (data.lat && data.lon) {
    filter.update({
      A: A,
      B: B,
      C: C,
      H: H,
      R: R,
      Q: Q,
      u: u,
      y: $V([data.lat, data.lon])
    })

    gps.state.position = {
      cov: filter.P.elements,
      pos: filter.x.elements
    }

    console.log(gps.state)
  }
  // if (data.type === 'GGA') {
  //   if (data.quality != null) {
  //     // log the gps value
  //     console.log('[' + data.lat + ', ' + data.lon + ']')
  //     logger.info('[' + data.lat + ', ' + data.lon + ']')

  //     // value exists?
  //     if (!sds011Data) return
  //     if (!sds011UpdatedAt) return
  //     if (!data.lat || !data.lon) return

  //     // check the time
  //     if (Math.abs(Date.now() - sds011UpdatedAt) > 2000) return

  //     // check last fetch api date
  //     if (Math.abs(Date.now() - last) < 5000) return

  //     // prepare the body
  //     const body = {
  //       'pm2.5': sds011Data.pm2p5,
  //       pm10: sds011Data.pm10,
  //       deviceId: config.deviceId || 'not_defined',
  //       lat: data.lat,
  //       long: data.lon
  //     }

  //     try {
  //       await fetch('https://macauiot.com/api/v1/air/create', {
  //         method: 'post',
  //         body: JSON.stringify(body),
  //         headers: { 'Content-Type': 'application/json' }
  //       })
  //         .then(res => res.json())
  //         .then(json => {
  //           console.log(json)
  //           logger.info(JSON.stringify(json))
  //         })
  //     } catch (error) {
  //       console.log(error)
  //       logger.info(error)
  //     }

  //     last = Date.now()
  //   } else {
  //     // log error
  //     console.log('no gps fix available')
  //     logger.info('no gps fix available')
  //   }
  // }
})
parser.on('data', function (data) {
  gps.update(data)
})
