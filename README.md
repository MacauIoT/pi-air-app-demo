# pi-air-app-demo

1. raspberry pi install raspbian OS
2. install node js
3. install git
4. download this project in pi and run it

```
cd pi-air-app-demo
npm install
node index.js
```

# explain

this script collect sensors' data (gps, air quality) and then send those data by API

```
https://macauiot.com/api/v1/air/create
```

API server source see https://github.com/MacauIoT/site
