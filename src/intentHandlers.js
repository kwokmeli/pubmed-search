"use strict";

const Alexa = require("alexa-sdk");
const util = require("util");

var constants = require("./constants");
var speechGeneration = require("./speechGeneration");

var states = {
	SEARCHMODE: "_SEARCHMODE",
	DESCRIPTION: "_DESCRIPTION"
};

var newSessionHandlers = {
	"LaunchRequest": function() {
		this.handler.state = states.SEARCHMODE;
		this.emit(":ask", constants.WELCOME_MESSAGE, speechGeneration.getGenericHelpMessage());
	},
	"SearchIntent": function() {
		this.handler.state = states.SEARCHMODE;
		this.emitWithState("SearchIntent");
	},
	"SelectIntent": function() {
		this.emit(":ask", "You must search for articles first before selecting one. " + speechGeneration.getSearchHelpMessage());
	},
	"TellMeThisIntent": function() {
		this.emit(":ask", "Please search for and select an article first. " + speechGeneration.getSearchHelpMessage());
	},
	"EMailIntent": function() {
		this.emit(":ask", "You must search for and select an article before sending an article to your e-mail. " + speechGeneration.getSearchHelpMessage());
	},
	"AMAZON.YesIntent": function() {
		this.emit(":ask", speechGeneration.getGenericHelpMessage(), speechGeneration.getGenericHelpMessage());
	},
	"AMAZON.NoIntent": function() {
		this.emit(":tell", constants.SHUTDOWN_MESSAGE);
	},
	"AMAZON.RepeatIntent": function() {
		this.emit(":ask", constants.HELP_MESSAGE, speechGeneration.getGenericHelpMessage());
	},
	"AMAZON.StopIntent": function() {
		this.emit(":tell", constants.EXIT_SKILL_MESSAGE);
	},
	"AMAZON.CancelIntent": function() {
		this.emit(":tell", constants.EXIT_SKILL_MESSAGE);
	},
	"AMAZON.StartOverIntent": function() {
		this.handler.state = states.SEARCHMODE;
		var output = "Ok, starting over. " + speechGeneration.getGenericHelpMessage();
		this.emit(":ask", output, output);
	},
	"AMAZON.HelpIntent": function() {
		this.emit(":ask", constants.HELP_MESSAGE + speechGeneration.getGenericHelpMessage(), speechGeneration.getGenericHelpMessage());
	},
	"SessionEndedRequest": function() {
		this.emit("AMAZON.StopIntent");
	},
	"Unhandled": function() {
		this.handler.state = states.SEARCHMODE;
		this.emitWithState("SearchByNameIntent");
	}
};

module.exports = newSessionHandlers;
