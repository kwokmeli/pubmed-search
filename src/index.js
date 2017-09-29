"use strict";
const Alexa = require("alexa-sdk");
const xml2js = require("xml2js");
const https = require("https");

var APP_ID = "amzn1.ask.skill.6c3b5cbf-71ab-470b-b440-adcc95f0e70d";

var skillName = "Pub Med Search";

//This is the welcome message for when a user starts the skill without a specific intent.
var WELCOME_MESSAGE = "Welcome to " + skillName + "To get started, say the name of a topic to search for.";

//This is the message a user will hear when they ask Alexa for help in your skill.
var HELP_MESSAGE = "I can help you find Pub Med articles.";

//This is the message a user will hear when they begin a new search
var NEW_SEARCH_MESSAGE = "To start a new search, you can say - find me articles about dentistry.";

//This is the message a user will hear when they ask Alexa for help while in the SEARCH state
var SEARCH_STATE_HELP_MESSAGE = "To search for articles, you can say - find me articles about cancer.";

var DESCRIPTION_STATE_HELP_MESSAGE = "Here are some things you can say: Tell me more, or give me his or her contact info";

// This is the message use when the decides to end the search
var SHUTDOWN_MESSAGE = "Ok.";

//This is the message a user will hear when they try to cancel or stop the skill.
var EXIT_SKILL_MESSAGE = "Ok.";

// =====================================================================================================
// ------------------------------ Section 2. Skill Code - Intent Handlers  -----------------------------
// =====================================================================================================
// CAUTION: Editing anything below this line might break your skill.
//======================================================================================================

var states = {
	SEARCHMODE: "_SEARCHMODE",
	DESCRIPTION: "_DESCRIPTION",
};

const newSessionHandlers = {
	"LaunchRequest": function() {
		this.handler.state = states.SEARCHMODE;
		this.emit(":ask", WELCOME_MESSAGE, getGenericHelpMessage());
	},
	"SearchIntent": function() {
		this.handler.state = states.SEARCHMODE;
		this.emitWithState("SearchIntent");
	},
	"AMAZON.YesIntent": function() {
		this.emit(":ask", getGenericHelpMessage(), getGenericHelpMessage());
	},
	"AMAZON.NoIntent": function() {
		this.emit(":tell", SHUTDOWN_MESSAGE);
	},
	"AMAZON.RepeatIntent": function() {
		this.emit(":ask", HELP_MESSAGE, getGenericHelpMessage());
	},
	"AMAZON.StopIntent": function() {
		this.emit(":tell", EXIT_SKILL_MESSAGE);
	},
	"AMAZON.CancelIntent": function() {
		this.emit(":tell", EXIT_SKILL_MESSAGE);
	},
	"AMAZON.StartOverIntent": function() {
		this.handler.state = states.SEARCHMODE;
		var output = "Ok, starting over." + getGenericHelpMessage();
		this.emit(":ask", output, output);
	},
	"AMAZON.HelpIntent": function() {
		this.emit(":ask", HELP_MESSAGE + getGenericHelpMessage(), getGenericHelpMessage());
	},
	"SessionEndedRequest": function() {
		this.emit("AMAZON.StopIntent");
	},
	"Unhandled": function() {
		this.handler.state = states.SEARCHMODE;
		this.emitWithState("SearchByNameIntent");
	}
};

var startSearchHandlers = Alexa.CreateStateHandler(states.SEARCHMODE, {
	"AMAZON.YesIntent": function() {
		this.emit(":ask", NEW_SEARCH_MESSAGE, NEW_SEARCH_MESSAGE);
	},
	"AMAZON.NoIntent": function() {
		this.emit(":tell", SHUTDOWN_MESSAGE);
	},
	"AMAZON.RepeatIntent": function() {
		var output;
		if (this.attributes.lastSearch) {
			output = this.attributes.lastSearch.lastSpeech;
		} else {
			output = getGenericHelpMessage();
		}
		this.emit(":ask",output, output);
	},
	"SearchIntent": function() {
		searchIntentHandler.call(this);
	},
	"AMAZON.HelpIntent": function() {
		this.emit(":ask", getGenericHelpMessage(), getGenericHelpMessage());
	},
	"AMAZON.StopIntent": function() {
		this.emit(":tell", EXIT_SKILL_MESSAGE);
	},
	"AMAZON.CancelIntent": function() {
		this.emit(":tell", EXIT_SKILL_MESSAGE);
	},
	"AMAZON.StartOverIntent": function() {
		this.handler.state = states.SEARCHMODE;
		var output = "Ok, starting over." + getGenericHelpMessage();
		this.emit(":ask", output, output);
	},
	"SessionEndedRequest": function() {
		this.emit("AMAZON.StopIntent");
	},
	"Unhandled": function() {
		this.emit(":ask", SEARCH_STATE_HELP_MESSAGE, SEARCH_STATE_HELP_MESSAGE);
	}
});

var descriptionHandlers = Alexa.CreateStateHandler(states.DESCRIPTION, {
	"SearchIntent": function() {
		searchIntentHandler.call(this);
	},
	"AMAZON.HelpIntent": function() {
		// var person = this.attributes.lastSearch.results[0];
		this.emit(":ask", "generate next prompt message");
	},
	"AMAZON.StopIntent": function() {
		this.emit(":tell", EXIT_SKILL_MESSAGE);
	},
	"AMAZON.CancelIntent": function() {
		this.emit(":tell", EXIT_SKILL_MESSAGE);
	},
	"AMAZON.NoIntent": function() {
		this.emit(":tell", SHUTDOWN_MESSAGE);
	},
	"AMAZON.YesIntent": function() {
		// this.emit("TellMeMoreIntent");
		tellMeMoreIntentHandler.call(this);
	},
	"AMAZON.RepeatIntent": function() {
		this.emit(":ask",this.attributes.lastSearch.lastSpeech, this.attributes.lastSearch.lastSpeech);
	},
	"AMAZON.StartOverIntent": function() {
		this.handler.state = states.SEARCHMODE;
		var output = "Ok, starting over." + getGenericHelpMessage();
		this.emit(":ask", output, output);
	},
	"SessionEndedRequest": function() {
		this.emit("AMAZON.StopIntent");
	},
	"Unhandled": function() {
		// var person = this.attributes.lastSearch.results[0];
		this.emit(":ask", "unhandled");
	}
});

// ------------------------- END of Intent Handlers  ---------------------------------
function searchIntentHandler() {

// // IMPORTANT STUFF
// var searchQuery = this.event.request.intent.slots[canSearch].value;
// //saving lastSearch results to the current session
// var lastSearch = this.attributes.lastSearch = "I MADE A SEARCH!!";
// var output;
//
// //saving last intent to session attributes
// this.attributes.lastSearch.lastIntent = "SearchIntent";
//
// this.handler.state = states.MULTIPLE_RESULTS; // change state to MULTIPLE_RESULTS
// this.attributes.lastSearch.lastSpeech = output;

	this.emit(":ask", "searchIntentHandler called");
}

function tellMeMoreIntentHandler() {
	this.emit(":ask", "tellMeMoreIntentHandler called");
}

// =====================================================================================================
// ------------------------------- Section 3. Generating Speech Messages -------------------------------
// =====================================================================================================

function getGenericHelpMessage(){
	return "Here is a generic help message.";
}

function generateSearchHelpMessage(){
	return "Here is a generic search help message.";
}

exports.handler = function(event, context, callback) {
	var alexa = Alexa.handler(event, context);
	alexa.appId = APP_ID;
	alexa.registerHandlers(newSessionHandlers, startSearchHandlers, descriptionHandlers);
	alexa.execute();
};

// =====================================================================================================
// ------------------------------------ Section 4. Helper Functions  -----------------------------------
// =====================================================================================================
// For more helper functions, visit the Alexa cookbook at https://github.com/alexa/alexa-cookbook
//======================================================================================================
function loopThroughArrayOfObjects(arrayOfStrings) {
	var joinedResult = "";
	// Looping through the each object in the array
	for (var i = 0; i < arrayOfStrings.length; i++) {
		//concatenating names (firstName + lastName ) for each item
		joinedResult = joinedResult + ", " + arrayOfStrings[i].firstName + " " + arrayOfStrings[i].lastName;
	}
	return joinedResult;
}

function sanitizeSearchQuery(searchQuery){
	searchQuery = searchQuery.replace(/’s/g, "").toLowerCase();
	searchQuery = searchQuery.replace(/'s/g, "").toLowerCase();
	return searchQuery;
}
