/**
 * Created by aleckim on 2018. 1. 25..
 * kecoRequester로부터 새로운 imgPath를 받아, airkorea.dust.image.controller로
 * 제공해서 hourly forecast를 받아와서 저장
 * route(controllerTown)에서 데이터를 가져가는 interface제공
 */

'use strict';

const async = require('async');
const ControllerAirkoreaDustImage = require('./airkorea.dust.image.controller');
const MsrStn = require('../models/modelMsrStnInfo');
const ArpltnHourlyForecast = require('../models/arpltn.hourly.forecast');

class AirkoreaHourlyForecastController {
    constructor(imgPaths) {
        this.imgPaths = imgPaths;
        this.airkoreaDustImageMgr;
    }

    _getMsrStn(callback) {
        MsrStn.find().lean().exec(function (err, stnList) {
            if (err) {
                return callback(err);
            }
            if (stnList.length === 0) {
                return callback(new Error("airkroea msr stn list length is 0"));
            }
            callback(null, stnList);
        });
    }

    _updateDb(obj, callback) {
        ArpltnHourlyForecast.update({stationName: obj.stationName, date: obj.date, code: obj.code},
            obj,
            {upsert:true},
            callback);
    }

    _makeArpltnHourForecast(stationName, code, pubDate, hourData) {
        return {
            stationName: stationName,
            date: new Date(hourData.date),
            code: code,
            val: hourData.val,
            dataTime: hourData.date,
            pubDate: pubDate
        };
    }

    _updateForecastList(forecastsObj, callback) {
        async.map(forecastsObj.hourly,
            (hourData, callback) => {
                var arpltnHourForecast;
                try {
                    if (hourData.val == undefined) {
                       log.warn("invalid val "+ forecastsObj.stationName+ " "+forecastsObj.code+" "+hourData.date);
                    }
                    else {
                        arpltnHourForecast = this._makeArpltnHourForecast(
                            forecastsObj.stationName,
                            forecastsObj.code,
                            forecastsObj.pubDate,
                            hourData);
                    }
                }
                catch(err) {
                    log.error(err);
                }
                if (arpltnHourForecast) {
                    this._updateDb(arpltnHourForecast, function (err) {
                        if (err)  {
                            log.error(err);
                        }
                        callback();
                    });
                }
                else {
                    callback();
                }
            }, callback);
    }

    _updateDustInfo(stn, code, callback) {
        async.waterfall([
                (callback) => {
                    this.airkoreaDustImageMgr
                        .getDustInfo(stn.geo[1],
                            stn.geo[0],
                            code.toUpperCase(),
                            'airkorea',
                            function (err, hourlyForecastObj) {
                                hourlyForecastObj.stationName = stn.stationName;
                                hourlyForecastObj.code = code;
                                callback(err, hourlyForecastObj);
                            });
                },
                (hourlyForecasts, callback) => {
                    this._updateForecastList(hourlyForecasts, callback);
                }
            ],
            callback);
    }

    _updateHourlyForecastEach(stnList, code, callback) {
        async.map(stnList,
            (stn, callback) => {
                this._updateDustInfo(stn, code, callback);
            },
            callback);
    }

    _updateHourlyForecast(stnList, callback) {
        async.mapSeries(['pm10', 'pm25'],
            (code, callback) => {
                this._updateHourlyForecastEach(stnList, code, callback);
            },
            callback);
    }

    _removeOldData() {
        var removeDate = new Date();
        removeDate.setDate(removeDate.getDate()-1);
        ArpltnHourlyForecast.remove({"date": {$lt:removeDate}}, function (err) {
            log.info('removed airpltn hourly forecast from date : ' + removeDate);
            if(err) {
                log.error(err);
            }
        });
    }

    do() {
        async.waterfall([
                (callback) => {
                    this.airkoreaDustImageMgr = new ControllerAirkoreaDustImage();
                    this.airkoreaDustImageMgr.getDustImage(this.imgPaths, callback);
                },
                (result, callback) => {
                    this._getMsrStn(callback);
                },
                (stnList, callback) => {
                    this._updateHourlyForecast(stnList, callback);
                }
            ],
            (err) => {
                if (err) {
                    log.error(err);
                }
                log.info("Finish update hourly forecast");
                delete this.airkoreaDustImageMgr;
                this._removeOldData();
            });
    }

    getForecast(stationName, callback) {
       ArpltnHourlyForecast.find({stationName: stationName}).lean().sort({date:1}).exec(function (err, forecastList) {
           callback(err, forecastList);
       });
    }
}

module.exports = AirkoreaHourlyForecastController;
