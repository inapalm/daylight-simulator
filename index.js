"use strict";
var d3 = require('d3');
var fs = require('fs');
var request = require("request");
var hueColor = require("./interpolateHueColor");
var times = require('./times');
var TimeInterval = require("./hueTimeIntervall");

var timeInterval = new TimeInterval();


var bodyParser = require('body-parser');
var express = require('express');
var app = express();

function saveConfig(cb) {
  var times = [];
  for(let x in timeInterval.contentsObj) {
    times.push({
      time: x,
      color: timeInterval.contentsObj[x].color
    });
  }
  fs.writeFile("./times.json", JSON.stringify(times), 'utf8', cb);
}

function getArray(req, res) {
  req.params.type = req.params.type || '';
  if(req.params.type.toLowerCase() === "object") {
    var colors = timeInterval.minuteArray.map(function(elem) {
      var rgb = d3.rgb(elem);
      return {r: rgb.r, g: rgb.g, b: rgb.b};
    });
    return res.json({offset: -timeInterval.offset, colors: colors});
  } else {
    return res.json({offset: -timeInterval.offset, colors: timeInterval.minuteArray});
  }
}

app.use(bodyParser.json());
app.get('/colors/intervals', function (req, res) {
  res.json(timeInterval.contentsObj);
});
app.put('/colors/intervals', function (req, res) {
  timeInterval.put(req.body);
  saveConfig(function(err) {
    if(err) {
      return res.status(500).json({error: "Persisting failed."});
    }
    return res.json(timeInterval.contentsObj);
  });
});
app.get('/colors/byMinute', getArray);
app.get('/colors/byMinute/:type', getArray);

app.post('/colors/:time/new', function(req, res) {
  if(req.params.time.split(':').length < 2) {
    return res.status(400).json({error: "Time must be in the format: hh:mm"});
  }
  var time = req.params.time.split(':')[0] + ":" + req.params.time.split(':')[1];
  var color = {
    h: Number(req.body.h || 0),
    s: Number(req.body.s || 0),
    l: Number(req.body.l || 0)
  };
  timeInterval.addV2(time, color);
  saveConfig(function(err) {
    if(err) {
      return res.status(500).json({error: "Persisting failed."});
    }
    return res.status(200).json({added: {time: time, color: color}});
  });
});






function transitionTo(color, time, cb) {
  if(!cb) {
    cb = function () {};
  }
  var body = hueColor.colorToHsv(color);
  body.transitiontime = time;
  body.on = true;
  var options = {
    method: 'PUT',
    url: 'http://192.168.0.137/api/2L9akNs43qMwG2GfCdV3SP3ol4hil2FkN6PR7CXX/lights/2/state',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify(body)
  };
  request(options, function (error, response, body) {
    if (error) {
      return cb(error);
    }
    cb(null, JSON.parse(body));
  });
}


function timeString(dateObj) {
  var hours = dateObj.getHours();
  if(hours < 10) {
    hours = "0" + hours;
  }
  var minutes = dateObj.getMinutes();
  if(minutes < 10) {
    minutes = "0" + minutes;
  }
  return hours + ":" + minutes;
}



function check2() {
  times.forEach(function(elem) {
    timeInterval.addV2(elem.time, elem.color);
  });
  var now = new Date();
  transitionTo(timeInterval.getColorForNow(), 30*10, function(err, result) {
    if(err) {
      return console.error(err);
    }
    console.log("result", timeString(now), JSON.stringify(result, null, 2));
  });
}

function init() {
  check2();
  app.listen(3000, "0.0.0.0");
  setInterval(check2, 60*1000);
}

init();







