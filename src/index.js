"use strict";
const Alexa = require("alexa-sdk");
const xml2js = require("xml2js");
const https = require("https");

const NA = "N/A";
const retMax = 10;

// App ID for mkwok
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
		if (this.attributes.lastSpeech) {
			output = this.attributes.lastSpeech;
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
		this.emit(":ask",this.attributes.lastSpeech, this.attributes.lastSpeech);
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

// Storage order within publicationsArray:
// Index 0: Article title (string)
// Index 1: Journal title (string)
// Index 2: Volume (string)
// Index 3: Issue (string)
// Index 4: ISSN Number (string)
// Index 5: ISSN Type (string)
// Index 6: PubMed ID (string)
// Index 7: Author first names (array)
// Index 8: Author last names (array)
// Index 9: Abstract (string)
// Index 10: Date published (array, YYYY/MM/DD)
// Index 11: Date received (array, YYYY/MM/DD)
// Index 12: Date revised (array, YYYY/MM/DD)
// Index 13: Date accepted (array, YYYY/NN/DD)
var publicationsArray = [];

function searchIntentHandler() {
	// Reset publicationsArray each time a new search is called
	publicationsArray.splice(0, publicationsArray.length);

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

	var searchTerm = this.event.request.intent.slots.TOPICS.value;
	var alexa = this;
	var subject = searchTerm;
	var searchURL;
	var articles = [];
	var j = 0;
	var speech = "";

	searchTerm = encodeURIComponent(searchTerm).replace(/'/g,"%27").replace(/"/g,"%22");
	searchURL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&retmode=json&retmax=" + retMax + "&term=" + searchTerm;

	https.get(searchURL, function (res) {
		res.setEncoding("utf8");
	  let body = "";
	  res.on("data", function (data) {
	    body += data;
	  });

	  res.on("end", function () {
	    body = JSON.parse(body);
      for (var i = 0; i < body.esearchresult.idlist.length; i++) {
	      articles.push(body.esearchresult.idlist[i]);
     	}

			if (articles.length === 0) {
				// No articles were found
				speech += "I'm sorry. I couldn't find any articles related to your requested search topic of " + subject + ". Please search again.";
				alexa.emit(":ask", speech);
			} else {
				storeArticles(readArticleTitles);

				// Store all articles and their information
				function storeArticles(callback) {
					getArticle(articles[j], function () {
						if (j != articles.length - 1) {
							j++;
							storeArticles(readArticleTitles);
						} else {
							// Execute readArticleTitles()
							callback();
						}
					});
				}

				function readArticleTitles() {
					// Store information of all articles in session attributes
					alexa.attributes.publicationsArray = publicationsArray;
					// Change state to DESCRIPTION since articles have been found
					alexa.handler.state = states.DESCRIPTION;

					speech += "Here are the top " + articles.length + " articles that match your search query of " + subject + " - ";

					for (var i = 0; i < articles.length; i++) {
						speech += "Article " + (i + 1) + " - " + publicationsArray[i][0];
						if (i == articles.length - 2) {
							speech += " - and ";
						} else if (i == articles.length - 1) {
							speech += ". ";
						} else {
							speech += " - ";
						}
					}

					speech += "Which article would you like to learn more about? "
					// Store last speech so it can be repeated if necessary
					alexa.attributes.lastSpeech = speech;

					alexa.emit(":ask", speech.replace(/\\/g, "").replace(/\"/g,""));
				}
			}
		});
	});
}

function getArticle(articleNumber, callback) {
	// Retrieve article using PubMed ID
	var abstractURL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&retmode=xml&rettype=abstract&id=" + articleNumber;

	https.get(abstractURL, function (res) {
		res.setEncoding("utf8");
		let body = "";
		res.on("data", function (data) {
			body += data;
		});

		res.on("end", function () {
			var parser = new xml2js.Parser();
			parser.parseString(body, function(err, result) {
				extractDetails(result, articleNumber, function () {
					callback();
				});
			});
		});
	});
}

function extractDetails(result, article, callback) {
	var journalTitle, articleTitle;
	var volume, issue;
	var issn, issnType;
	var datePublished = [];
	var dateReceived = [];
	var dateRevised = [];
	var dateAccepted = [];
	var abstract = "";
	var articleInformation = [];
	var authorsFirst = [];
	var authorsLast = [];
	// var authorsAffiliation = [];

	// Retrieve journal title if it exists
	if (result["PubmedArticleSet"]["PubmedArticle"][0]["MedlineCitation"][0]["Article"][0]["Journal"][0]["Title"]) {
		journalTitle = JSON.stringify(result["PubmedArticleSet"]["PubmedArticle"][0]["MedlineCitation"][0]["Article"][0]["Journal"][0]["Title"]).replace(/[\\\"\[\]]/g, "");
	} else {
		journalTitle = NA;
	}

	// Retrieve article title if it exists
	if (result["PubmedArticleSet"]["PubmedArticle"][0]["MedlineCitation"][0]["Article"][0]["ArticleTitle"]) {
		articleTitle = JSON.stringify(result["PubmedArticleSet"]["PubmedArticle"][0]["MedlineCitation"][0]["Article"][0]["ArticleTitle"]).replace(/[\\\"\[\]]/g, "");
	} else {
		articleTitle = NA;
	}

	// Retrieve volume if it exists
	if (result["PubmedArticleSet"]["PubmedArticle"][0]["MedlineCitation"][0]["Article"][0]["Journal"][0]["JournalIssue"][0]["Volume"]) {
		volume = JSON.stringify(result["PubmedArticleSet"]["PubmedArticle"][0]["MedlineCitation"][0]["Article"][0]["Journal"][0]["JournalIssue"][0]["Volume"]).replace(/[\\\"\[\]]/g, "");
console.log("TYPE OF VOLUME: " + typeof volume);
	} else {
		volume = NA;
	}

	// Retrieve issue if it exists
	if (result["PubmedArticleSet"]["PubmedArticle"][0]["MedlineCitation"][0]["Article"][0]["Journal"][0]["JournalIssue"][0]["Issue"]) {
		issue = JSON.stringify(result["PubmedArticleSet"]["PubmedArticle"][0]["MedlineCitation"][0]["Article"][0]["Journal"][0]["JournalIssue"][0]["Issue"]).replace(/[\\\"\[\]]/g, "");
	} else {
		issue = NA;
	}

	// Retrieve ISSN number if it exists
	if (result["PubmedArticleSet"]["PubmedArticle"][0]["MedlineCitation"][0]["Article"][0]["Journal"][0]["ISSN"][0]["_"]){
		issn = JSON.stringify(result["PubmedArticleSet"]["PubmedArticle"][0]["MedlineCitation"][0]["Article"][0]["Journal"][0]["ISSN"][0]["_"]).replace(/[\\\"\[\]]/g, "");
console.log("TYPE OF ISSN NUMBER: " + typeof issn);
	} else {
		issn = NA;
	}

	// Retrieve ISSN type if it exists
	if (result["PubmedArticleSet"]["PubmedArticle"][0]["MedlineCitation"][0]["Article"][0]["Journal"][0]["ISSN"][0]["$"]["IssnType"]) {
		issnType = JSON.stringify(result["PubmedArticleSet"]["PubmedArticle"][0]["MedlineCitation"][0]["Article"][0]["Journal"][0]["ISSN"][0]["$"]["IssnType"]).replace(/[\\\"\[\]]/g, "");
	} else {
		issnType = NA;
	}

	// All dates are in the form YYYY, MM, DD
	// Retrieve publication dates if they exist
	if (result["PubmedArticleSet"]["PubmedArticle"][0]["MedlineCitation"][0]["Article"][0]["ArticleDate"]) {
		datePublished.push(JSON.stringify(result["PubmedArticleSet"]["PubmedArticle"][0]["MedlineCitation"][0]["Article"][0]["ArticleDate"][0]["Year"]).replace(/[\\\"\[\]]/g, ""),
											 JSON.stringify(result["PubmedArticleSet"]["PubmedArticle"][0]["MedlineCitation"][0]["Article"][0]["ArticleDate"][0]["Month"]).replace(/[\\\"\[\]]/g, ""),
											 JSON.stringify(result["PubmedArticleSet"]["PubmedArticle"][0]["MedlineCitation"][0]["Article"][0]["ArticleDate"][0]["Day"]).replace(/[\\\"\[\]]/g, ""));
	}

	// Retrieve dates for when article was received, revised, and accepted, if available
	for (var i = 0; i < result["PubmedArticleSet"]["PubmedArticle"][0]["PubmedData"][0]["History"][0]["PubMedPubDate"].length; i++) {
		var pubStatus = result["PubmedArticleSet"]["PubmedArticle"][0]["PubmedData"][0]["History"][0]["PubMedPubDate"][i]["$"]["PubStatus"].toLowerCase();
		if (pubStatus === "received") {
			dateReceived.push(JSON.stringify(result["PubmedArticleSet"]["PubmedArticle"][0]["PubmedData"][0]["History"][0]["PubMedPubDate"][i]["Year"]).replace(/[\\\"\[\]]/g, ""),
												JSON.stringify(result["PubmedArticleSet"]["PubmedArticle"][0]["PubmedData"][0]["History"][0]["PubMedPubDate"][i]["Month"]).replace(/[\\\"\[\]]/g, ""),
												JSON.stringify(result["PubmedArticleSet"]["PubmedArticle"][0]["PubmedData"][0]["History"][0]["PubMedPubDate"][i]["Day"]).replace(/[\\\"\[\]]/g, ""));
		} else if (pubStatus === "revised") {
			dateRevised.push(JSON.stringify(result["PubmedArticleSet"]["PubmedArticle"][0]["PubmedData"][0]["History"][0]["PubMedPubDate"][i]["Year"]).replace(/[\\\"\[\]]/g, ""),
											 JSON.stringify(result["PubmedArticleSet"]["PubmedArticle"][0]["PubmedData"][0]["History"][0]["PubMedPubDate"][i]["Month"]).replace(/[\\\"\[\]]/g, ""),
											 JSON.stringify(result["PubmedArticleSet"]["PubmedArticle"][0]["PubmedData"][0]["History"][0]["PubMedPubDate"][i]["Day"]).replace(/[\\\"\[\]]/g, ""));
		} else if (pubStatus === "accepted") {
			dateAccepted.push(JSON.stringify(result["PubmedArticleSet"]["PubmedArticle"][0]["PubmedData"][0]["History"][0]["PubMedPubDate"][i]["Year"]).replace(/[\\\"\[\]]/g, ""),
												JSON.stringify(result["PubmedArticleSet"]["PubmedArticle"][0]["PubmedData"][0]["History"][0]["PubMedPubDate"][i]["Month"]).replace(/[\\\"\[\]]/g, ""),
												JSON.stringify(result["PubmedArticleSet"]["PubmedArticle"][0]["PubmedData"][0]["History"][0]["PubMedPubDate"][i]["Day"]).replace(/[\\\"\[\]]/g, ""));
		}
	}

	// Retrieve abstract if it exists
	if (result["PubmedArticleSet"]["PubmedArticle"][0]["MedlineCitation"][0]["Article"][0]["Abstract"]) {
		for (var i = 0; i < result["PubmedArticleSet"]["PubmedArticle"][0]["MedlineCitation"][0]["Article"][0]["Abstract"][0]["AbstractText"].length; i++) {
			if (result["PubmedArticleSet"]["PubmedArticle"][0]["MedlineCitation"][0]["Article"][0]["Abstract"][0]["AbstractText"][i]["_"]) {
				abstract += JSON.stringify(result["PubmedArticleSet"]["PubmedArticle"][0]["MedlineCitation"][0]["Article"][0]["Abstract"][0]["AbstractText"][i]["_"]).replace(/[\\\"\[\]]/g, "") + " ";
			} else {
				abstract += JSON.stringify(result["PubmedArticleSet"]["PubmedArticle"][0]["MedlineCitation"][0]["Article"][0]["Abstract"][0]["AbstractText"][i]).replace(/[\\\"\[\]]/g, "");
			}
		}
	} else {
		abstract = NA;
	}

	// Retrieve all authors if they exist
	if (result["PubmedArticleSet"]["PubmedArticle"][0]["MedlineCitation"][0]["Article"][0]["AuthorList"]) {
		for (var i = 0; i < result["PubmedArticleSet"]["PubmedArticle"][0]["MedlineCitation"][0]["Article"][0]["AuthorList"][0]["Author"].length; i++) {
			var aff = [];
			authorsFirst.push(JSON.stringify(result["PubmedArticleSet"]["PubmedArticle"][0]["MedlineCitation"][0]["Article"][0]["AuthorList"][0]["Author"][i]["ForeName"]).replace(/[\\\"\[\]]/g, ""));
			authorsLast.push(JSON.stringify(result["PubmedArticleSet"]["PubmedArticle"][0]["MedlineCitation"][0]["Article"][0]["AuthorList"][0]["Author"][i]["LastName"]).replace(/[\\\"\[\]]/g, ""));

			// Affiliations include extraneous information
			// for (var j = 0; j < result["PubmedArticleSet"]["PubmedArticle"][0]["MedlineCitation"][0]["Article"][0]["AuthorList"][0]["Author"][i]["AffiliationInfo"].length; j++) {
			// 	aff.push(result["PubmedArticleSet"]["PubmedArticle"][0]["MedlineCitation"][0]["Article"][0]["AuthorList"][0]["Author"][i]["AffiliationInfo"][j]["Affiliation"]);
			// }
			// authorsAffiliation.push(aff);
		}
	} else {
		authorsFirst.push(NA);
		authorsLast.push(NA);
	}

	articleInformation.push(articleTitle, journalTitle, volume, issue, issn, issnType, article, authorsFirst, authorsLast, abstract, datePublished,
													dateReceived, dateRevised, dateAccepted);

	publicationsArray.push(articleInformation);
	callback();
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

function spellOut(toSpell) {
	var arr = toSpell.split("");
	var str = "";

	for (var i = 0; i < arr.length; i++) {
		str += arr[i] + " ";
	}

	return str;
}
