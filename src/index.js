"use strict";
const Alexa = require("alexa-sdk");
const util = require("util");

var intentHandlers = require("./intentHandlers");
var stateHandlers = require("./stateHandlers");
var constants = require("./constants");

exports.handler = function(event, context, callback) {
	var alexa = Alexa.handler(event, context);
	alexa.appId = constants.APP_ID;
	alexa.registerHandlers(intentHandlers, stateHandlers.startSearchHandlers, stateHandlers.descriptionHandlers);
	alexa.execute();
};
