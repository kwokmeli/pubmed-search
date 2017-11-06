"use strict";

const Alexa = require("alexa-sdk");
const util = require("util");

var constants = require("./constants");
var speechGeneration = require("./speechGeneration");
var intentFunctions = require("./intentFunctions");

var states = {
	SEARCHMODE: "_SEARCHMODE",
	DESCRIPTION: "_DESCRIPTION"
};

var stateHandlers = {
  startSearchHandlers: Alexa.CreateStateHandler(states.SEARCHMODE, {
  	"AMAZON.YesIntent": function() {
  		this.emit(":ask", constants.NEW_SEARCH_MESSAGE, constants.NEW_SEARCH_MESSAGE);
  	},

  	"AMAZON.NoIntent": function() {
  		this.emit(":tell", constants.SHUTDOWN_MESSAGE);
  	},

  	"AMAZON.RepeatIntent": function() {
  		var output;
  		if (this.attributes.repeatSpeech) {
  			output = this.attributes.repeatSpeech;
  		} else {
  			output = speechGeneration.getGenericHelpMessage();
  		}
  		this.emit(":ask",output, output);
  	},

  	"SearchIntent": function() {
  		intentFunctions.searchIntentHandler.call(this);
  	},

  	"SelectIntent": function() {
  		this.emit(":ask", "You must search for articles before selecting one. " + speechGeneration.getSearchHelpMessage());
  	},

  	"TellMeThisIntent": function() {
  		this.emit(":ask", "Please search for articles first. " + speechGeneration.getSearchHelpMessage());
  	},

  	"EMailIntent": function() {
  		this.emit(":ask", "Please search for articles first. " + speechGeneration.getSearchHelpMessage());
  	},

  	"AMAZON.HelpIntent": function() {
  		this.emit(":ask", speechGeneration.getGenericHelpMessage(), speechGeneration.getGenericHelpMessage());
  	},

  	"AMAZON.StopIntent": function() {
  		this.emit(":tell", constants.EXIT_SKILL_MESSAGE);
  	},

  	"AMAZON.CancelIntent": function() {
  		this.emit(":tell", constants.EXIT_SKILL_MESSAGE);
  	},

  	"AMAZON.StartOverIntent": function() {
  		this.handler.state = states.SEARCHMODE;
  		var output = "Ok, starting over. ";
  		this.emit(":ask", output, output);
  	},

  	"SessionEndedRequest": function() {
  		this.emit("AMAZON.StopIntent");
  	},

  	"Unhandled": function() {
  		this.emit(":ask", constants.SEARCH_STATE_HELP_MESSAGE, constants.SEARCH_STATE_HELP_MESSAGE);
  	}
  }),

  descriptionHandlers: Alexa.CreateStateHandler(states.DESCRIPTION, {
  	"SearchIntent": function() {
  		intentFunctions.searchIntentHandler.call(this);
  	},

  	"SelectIntent": function() {
  		if (this.attributes.publicationsArray) {
  			intentFunctions.selectIntentHandler.call(this);
  		} else {
  			this.emit(":ask", "Please search for articles before selecting one. " + speechGeneration.getSearchHelpMessage());
  		}
  	},

  	"TellMeThisIntent": function() {
  		if (this.attributes.articleNumber) {
  			intentFunctions.tellMeThisIntentHander.call(this);
  		} else {
  			this.emit(":ask", "Please select an article first. " + speechGeneration.getSelectHelpMessage());
  		}
  	},

  	"EMailIntent": function() {
  		if (this.attributes.articleNumber) {
  			if (this.event.session.user.accessToken) {
  				intentFunctions.EMailIntentHandler.call(this);
  			} else {
  				this.emit(":ask", "You must link your account through the Amazon Alexa app before sending e-mails. " + speechGeneration.getEMailHelpMessage());
  			}
  		} else {
  			this.emit(":ask", "Please select an article in order to e-mail it to yourself. " + speechGeneration.getSelectHelpMessage());
  		}
  	},

  	"AMAZON.HelpIntent": function() {
  		this.emit(":ask", speechGeneration.getGenericHelpMessage());
  	},

  	"AMAZON.StopIntent": function() {
  		this.emit(":tell", constants.EXIT_SKILL_MESSAGE);
  	},

  	"AMAZON.CancelIntent": function() {
  		this.emit(":tell", constants.EXIT_SKILL_MESSAGE);
  	},

  	"AMAZON.NoIntent": function() {
  		this.emit(":tell", constants.SHUTDOWN_MESSAGE);
  	},

  	"AMAZON.RepeatIntent": function() {
  		this.emit(":ask",this.attributes.repeatSpeech, this.attributes.repeatSpeech);
  	},

  	"AMAZON.StartOverIntent": function() {
  		this.handler.state = states.SEARCHMODE;
  		var output = "Ok, starting over. " ;
  		this.emit(":ask", output, output);
  	},

  	"SessionEndedRequest": function() {
  		this.emit("AMAZON.StopIntent");
  	},

  	"Unhandled": function() {
  		this.emit(":ask", "unhandled");
  	}
  })
};

module.exports = stateHandlers;
