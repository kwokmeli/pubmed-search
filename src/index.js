"use strict";
const Alexa = require("alexa-sdk");
const xml2js = require("xml2js");
const https = require("https");
const google = require("googleapis");
const googleAuth = require("google-auth-library");
const util = require("util");

const NA = "N/A";
const retMax = 10;

// App ID for mkwok
var APP_ID = "amzn1.ask.skill.6c3b5cbf-71ab-470b-b440-adcc95f0e70d";

var CLIENT_ID = "1008286386485-aot4ak0kmniui967avelk9497mapkjq3.apps.googleusercontent.com";
var CLIENT_SECRET = "FIstk8ZgQ1w3DlMZi-riSkSF";
var SCOPES = ["https://www.googleapis.com/auth/gmail.send", "https://www.googleapis.com/auth/gmail.metadata"];

var skillName = "Pub Med Search";

// This is the welcome message for when a user starts the skill without a specific intent.
var WELCOME_MESSAGE = "Welcome to " + skillName + "To get started, search for a topic of interest. If you ever need help, just say - I need help. ";

// This is the message a user will hear when they ask Alexa for help in your skill.
var HELP_MESSAGE = "I can help you find articles from the Pub Med database. ";

// This is the message a user will hear when they begin a new search
var NEW_SEARCH_MESSAGE = "To start a new search, you can say - find me articles about dentistry. ";

// This is the message a user will hear when they ask Alexa for help while in the SEARCH state
var SEARCH_STATE_HELP_MESSAGE = "To search for articles, you can say - find me articles about cancer. ";

// This is the message use when the decides to end the search
var SHUTDOWN_MESSAGE = "Ok. ";

// This is the message a user will hear when they try to cancel or stop the skill.
var EXIT_SKILL_MESSAGE = "Ok. ";

// =====================================================================================================
// ------------------------------ Section 2. Skill Code - Intent Handlers  -----------------------------
// =====================================================================================================

var states = {
	SEARCHMODE: "_SEARCHMODE",
	DESCRIPTION: "_DESCRIPTION"
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
	"SelectIntent": function() {
		this.emit(":ask", "You must search for articles first before selecting one. " + getSearchHelpMessage());
	},
	"TellMeThisIntent": function() {
		this.emit(":ask", "Please search for and select an article first. " + getSearchHelpMessage());
	},
	"EMailIntent": function() {
		this.emit(":ask", "You must search for and select an article before sending an article to your e-mail. " + getSearchHelpMessage());
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
		var output = "Ok, starting over. " + getGenericHelpMessage();
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
		if (this.attributes.repeatSpeech) {
			output = this.attributes.repeatSpeech;
		} else {
			output = getGenericHelpMessage();
		}
		this.emit(":ask",output, output);
	},
	"SearchIntent": function() {
		searchIntentHandler.call(this);
	},
	"SelectIntent": function() {
		this.emit(":ask", "You must search for articles before selecting one. " + getSearchHelpMessage());
	},
	"TellMeThisIntent": function() {
		this.emit(":ask", "Please search for articles first. " + getSearchHelpMessage());
	},
	"EMailIntent": function() {
		this.emit(":ask", "Please search for articles first. " + getSearchHelpMessage());
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
		var output = "Ok, starting over. ";
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
	"SelectIntent": function() {
		if (this.attributes.publicationsArray) {
			selectIntentHandler.call(this);
		} else {
			this.emit(":ask", "Please search for articles before selecting one. " + getSearchHelpMessage());
		}
	},
	"TellMeThisIntent": function() {
		if (this.attributes.articleNumber) {
			tellMeThisIntentHander.call(this);
		} else {
			this.emit(":ask", "Please select an article first. " + getSelectHelpMessage());
		}
	},
	"EMailIntent": function() {
		if (this.attributes.articleNumber) {
			if (this.event.session.user.accessToken) {
				EMailIntentHandler.call(this);
			} else {
				this.emit(":ask", "You must link your account through the Amazon Alexa app before sending e-mails. " + getEMailHelpMessage());
			}
		} else {
			this.emit(":ask", "Please select an article in order to e-mail it to yourself. " + getSelectHelpMessage());
		}
	},
	"AMAZON.HelpIntent": function() {
		this.emit(":ask", getGenericHelpMessage());
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
	// "AMAZON.YesIntent": function() {
	// 	// this.emit("TellMeMoreIntent");
	// },
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
	var searchTerm = this.event.request.intent.slots.TOPICS.value;
	var alexa = this;
	var subject = searchTerm;
	var searchURL;
	var articles = [];
	var j = 0;
	var speech = "";

	// Reset publicationsArray each time a new search is called
	publicationsArray.splice(0, publicationsArray.length);

	// Reset selected article number
	if (this.attributes.articleNumber) {
		delete this.attributes.articleNumber;
	}

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
console.log("went into storeArticles");
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
console.log("went into readArticleTitles");
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
console.log("speech = " + speech);
					// Store last speech so it can be repeated if necessary
					alexa.attributes.repeatSpeech = speech;

					alexa.emit(":ask", speech);
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
console.log(util.inspect(result, false, null));
				extractDetails(result, articleNumber, function () {
					callback();
				});
			});
		});
	});
}

function extractDetails(result, article, callback) {
console.log("went into extractDetails");
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

	if (result["PubmedArticleSet"]["PubmedBookArticle"]) {
		volume = issue = issn = issnType = NA;
		// Retrieve book title if it exists
		// Check ArticleTitle first, BookTitle second
		if (result["PubmedArticleSet"]["PubmedBookArticle"][0]["BookDocument"][0]["ArticleTitle"]) {
			articleTitle = JSON.stringify(result["PubmedArticleSet"]["PubmedBookArticle"][0]["BookDocument"][0]["ArticleTitle"][0]["_"]).replace(/[\\\"\[\]]/g, "");
		} else if (result["PubmedArticleSet"]["PubmedBookArticle"][0]["BookDocument"][0]["Book"][0]["BookTitle"]) {
			articleTitle = JSON.stringify(result["PubmedArticleSet"]["PubmedBookArticle"][0]["BookDocument"][0]["Book"][0]["BookTitle"][0]["_"]).replace(/[\\\"\[\]]/g, "");
		} else {
			articleTitle = NA;
		}

		// Retrieve book collection title if it exists
		if (result["PubmedArticleSet"]["PubmedBookArticle"][0]["BookDocument"][0]["Book"][0]["CollectionTitle"]) {
			journalTitle = result["PubmedArticleSet"]["PubmedBookArticle"][0]["BookDocument"][0]["Book"][0]["CollectionTitle"][0]["_"];
		} else {
			journalTitle = NA;
		}

		// Retrieve publication date if it exists
		if (result["PubmedArticleSet"]["PubmedBookArticle"][0]["BookDocument"][0]["Book"][0]["PubDate"]) {
			let year, month, day;
			if (result["PubmedArticleSet"]["PubmedBookArticle"][0]["BookDocument"][0]["Book"][0]["PubDate"][0]["Year"]) {
				year = result["PubmedArticleSet"]["PubmedBookArticle"][0]["BookDocument"][0]["Book"][0]["PubDate"][0]["Year"][0];
			} else {
				year = NA;
			}

			if (result["PubmedArticleSet"]["PubmedBookArticle"][0]["BookDocument"][0]["Book"][0]["PubDate"][0]["Month"]) {
				month = result["PubmedArticleSet"]["PubmedBookArticle"][0]["BookDocument"][0]["Book"][0]["PubDate"][0]["Month"][0];
			} else {
				month = NA;
			}

			// TODO: Figure out how date is shown for book articles
			day = NA;

			datePublished.push(JSON.stringify(year.replace(/[\\\"\[\]]/g, "")),
												 JSON.stringify(month.replace(/[\\\"\[\]]/g, "")),
												 JSON.stringify(day.replace(/[\\\"\[\]]/g, "")));
		}

		// Retrieve abstract if it exists
		if (result["PubmedArticleSet"]["PubmedBookArticle"][0]["BookDocument"][0]["Abstract"][0]["AbstractText"]) {
			abstract = result["PubmedArticleSet"]["PubmedBookArticle"][0]["BookDocument"][0]["Abstract"][0]["AbstractText"][0];
		} else {
			abstract = NA;
		}

		// Retrieve all authors if they exist
		if (result["PubmedArticleSet"]["PubmedBookArticle"][0]["BookDocument"][0]["AuthorList"][0]["Author"]) {
			for (var i = 0; i < result["PubmedArticleSet"]["PubmedBookArticle"][0]["BookDocument"][0]["AuthorList"][0]["Author"].length; i++) {

				if (result["PubmedArticleSet"]["PubmedBookArticle"][0]["BookDocument"][0]["AuthorList"][0]["Author"][i]["ForeName"]) {
					authorsFirst.push(JSON.stringify(result["PubmedArticleSet"]["PubmedBookArticle"][0]["BookDocument"][0]["AuthorList"][0]["Author"][i]["ForeName"][0]).replace(/[\\\"\[\]]/g, ""));
				} else {
					authorsFirst.push(NA);
				}

				if (result["PubmedArticleSet"]["PubmedBookArticle"][0]["BookDocument"][0]["AuthorList"][0]["Author"][i]["LastName"]) {
					authorsLast.push(JSON.stringify(result["PubmedArticleSet"]["PubmedBookArticle"][0]["BookDocument"][0]["AuthorList"][0]["Author"][i]["LastName"][0]).replace(/[\\\"\[\]]/g, ""));
				} else {
					authorsLast.push(NA);
				}
			}
		} else {
			authorsFirst.push(NA);
			authorsLast.push(NA);
		}

	} else if (result["PubmedArticleSet"]["PubmedArticle"]) {
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

				if (result["PubmedArticleSet"]["PubmedArticle"][0]["MedlineCitation"][0]["Article"][0]["AuthorList"][0]["Author"][i]["ForeName"]) {
					authorsFirst.push(JSON.stringify(result["PubmedArticleSet"]["PubmedArticle"][0]["MedlineCitation"][0]["Article"][0]["AuthorList"][0]["Author"][i]["ForeName"]).replace(/[\\\"\[\]]/g, ""));
				} else {
					authorsFirst.push(NA);
				}

				if (result["PubmedArticleSet"]["PubmedArticle"][0]["MedlineCitation"][0]["Article"][0]["AuthorList"][0]["Author"][i]["LastName"]) {
					authorsLast.push(JSON.stringify(result["PubmedArticleSet"]["PubmedArticle"][0]["MedlineCitation"][0]["Article"][0]["AuthorList"][0]["Author"][i]["LastName"]).replace(/[\\\"\[\]]/g, ""));
				} else {
					authorsLast.push(NA);
				}

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
	} else {
		console.log("New XML format, unable to read Pubmed Article " + article);
	}

	articleInformation.push(articleTitle, journalTitle, volume, issue, issn, issnType, article, authorsFirst, authorsLast, abstract, datePublished,
													dateReceived, dateRevised, dateAccepted);

	publicationsArray.push(articleInformation);
	callback();
}

function selectIntentHandler() {
	var str = "";
	var articleNumber = this.event.request.intent.slots.AMAZON_NUMBER.value;

	if ((articleNumber >= 1) && (articleNumber <= retMax)) {
		this.attributes.articleNumber = articleNumber;
		if (this.attributes.publicationsArray[articleNumber - 1][0] !== NA) {
			str += "What would you like to know about article " + articleNumber + " - " + this.attributes.publicationsArray[articleNumber - 1][0] + "? ";
		} else {
			str += "What would you like to know about article " + articleNumber + "? ";
		}
		this.emit(":ask", str);
	} else {
		this.emit(":ask", "Articles are numbered 1 through " + retMax + ". Please select a valid article.");
	}
}

function tellMeThisIntentHander() {
	var infoType = this.event.request.intent.slots.INFO_TYPE.value.toLowerCase();
	var article = this.attributes.publicationsArray[this.attributes.articleNumber - 1];
	var str = "";

	if (infoType === "title") {
		if (article[0] !== NA && article[1] !== NA) {
			str += "The title of your requested article is - " + article[0] +
						 " - and it was published in " + article[1] + ". ";
		} else if (article[0] !== NA) {
			str += "The title of your requested article is - " + article[0] + ". Unfortunately, I could not find the name of the journal it was published in. ";
		} else if (article[1] !== NA) {
			str += "Your requested article was published in - " + article[1] + ". Unfortunately, I could not find the name of the article's title. "
		} else {
			str += "I'm sorry - I couldn't find the name of the title nor the name of the journal it was published in. "
		}

	} else if ((infoType === "date") || (infoType === "dates")) {
		// TODO: Handle cases where only partial dates are provided (e.g. month and year are provided but not day)
		if (article[10].length === 0) {
			str += "Unfortunately, I couldn't find a publication date for this article. ";

			if ((article[11].length !== 0) && (article[12].length !== 0) && (article[13].length !== 0)) {
				str += "However, I did find dates for when the article was received, revised, and accepted. ";
				str += "The article was received " + returnFullDate(article[11][0], article[11][1], article[11][2]) + " - revised " +
							 returnFullDate(article[12][0], article[12][1], article[12][2]) + " - and accepted " + returnFullDate(article[13][0], article[13][1], article[13][2]) + ". ";
			} else if ((article[11].length !== 0) && (article[12].length !== 0)) {
				str += "However, I did find dates for when the article was received and revised. ";
				str += "The article was received " + returnFullDate(article[11][0], article[11][1], article[11][2]) + " - and revised " +
							 returnFullDate(article[12][0], article[12][1], article[12][2]) + ". ";
			} else if ((article[11].length !== 0) && (article[13].length !== 0)) {
				str += "However, I did find dates for when the article was received and accepted. ";
				str += "The article was received " + returnFullDate(article[11][0], article[11][1], article[11][2]) + " - and accepted " +
							 returnFullDate(article[13][0], article[13][1], article[13][2]) + ". ";
			} else if ((article[12].length !== 0) && (article[13].length !== 0)) {
				str += "However, I did find dates for when the article was revised and accepted. ";
				str += "The article was revised " + returnFullDate(article[12][0], article[12][1], article[12][2]) + " - and accepted " +
							 returnFullDate(article[13][0], article[13][1], article[13][2]) + ". ";
			} else if (article[11].length !== 0) {
				str += "However, I did find a date for when the article was received. ";
				str += "The article was received " + returnFullDate(article[11][0], article[11][1], article[11][2]) + ". ";
			} else if (article[12].length !== 0) {
				str += "However, I did find a date for when the article was revised. ";
				str += "The article was revised " + returnFullDate(article[12][0], article[12][1], article[12][2]) + ". ";
			} else if (article[13].length !== 0) {
				str += "However, I did find a date for when the article was accepted. ";
				str += "The article was accepted " + returnFullDate(article[13][0], article[13][1], article[13][2]) + ". ";
			} else {
				str += "In addition, I was unable to find a date for when the article was received, revised, or accepted. "
			}

		} else {
			str += "The article was published " + returnFullDate(article[10][0], article[10][1], article[10][2]) + ". ";

			if ((article[11].length !== 0) && (article[12].length !== 0) && (article[13].length !== 0)) {
				str += "In addition, I found dates for when the article was received, revised, and accepted. ";
				str += "The article was received " + returnFullDate(article[11][0], article[11][1], article[11][2]) + " - revised " +
							 returnFullDate(article[12][0], article[12][1], article[12][2]) + " - and accepted " + returnFullDate(article[13][0], article[13][1], article[13][2]) + ". ";
			} else if ((article[11].length !== 0) && (article[12].length !== 0)) {
				str += "In addition, I found dates for when the article was received and revised. ";
				str += "The article was received " + returnFullDate(article[11][0], article[11][1], article[11][2]) + " - and revised " +
							 returnFullDate(article[12][0], article[12][1], article[12][2]) + ". ";
			} else if ((article[11].length !== 0) && (article[13].length !== 0)) {
				str += "In addition, I found dates for when the article was received and accepted. ";
				str += "The article was received " + returnFullDate(article[11][0], article[11][1], article[11][2]) + " - and accepted " +
							 returnFullDate(article[13][0], article[13][1], article[13][2]) + ". ";
			} else if ((article[12].length !== 0) && (article[13].length !== 0)) {
				str += "In addition, I found dates for when the article was revised and accepted. ";
				str += "The article was revised " + returnFullDate(article[12][0], article[12][1], article[12][2]) + " - and accepted " +
							 returnFullDate(article[13][0], article[13][1], article[13][2]) + ". ";
			} else if (article[11].length !== 0) {
				str += "In addition, I found a date for when the article was received. ";
				str += "The article was received " + returnFullDate(article[11][0], article[11][1], article[11][2]) + ". ";
			} else if (article[12].length !== 0) {
				str += "In addition, I found a date for when the article was revised. ";
				str += "The article was revised " + returnFullDate(article[12][0], article[12][1], article[12][2]) + ". ";
			} else if (article[13].length !== 0) {
				str += "In addition, I found a date for when the article was accepted. ";
				str += "The article was accepted " + returnFullDate(article[13][0], article[13][1], article[13][2]) + ". ";
			} else {
				str += "Unfortunately, I was unable to find a date for when the article was received, revised, or accepted. "
			}
		}

	} else if (infoType === "author" || infoType === "authors") {
		if (article[7].length !== 0) {
			if (article[7].length == 1) {
				str += "The author of this article is ";
			} else {
				str += "The authors for this article are - ";
			}
			for (var i = 0; i < article[7].length; i++) {
				if (article[7].length === 1) {
					str += article[7][i] + " " + article[8][i] + ". ";
				} else if (i === article[7].length - 2) {
					str += article[7][i] + " " + article[8][i] + ", and ";
				} else if (i === article[7].length - 1) {
					str += article[7][i] + " " + article[8][i] + ". ";
				} else {
					str += article[7][i] + " " + article[8][i] + ", ";
				}
			}
		} else {
			str += "Unfortunately, I was unable to find the authors of this article. ";
		}

	} else if (infoType === "issn") {
		if (article[4] !== NA) {
			str += "The I S S N number for this publication is " + spellOut(article[4]) + ". "
		}

		if (article[5] !== NA) {
			str += "The I S S N type is " + article[5] + ". ";
		}

	} else if (infoType === "issue") {
		if ((article[3] !== NA) && (article[1] !== NA)) {
			str += "This article is issue " + article[3] + " in " + article[1] + ". ";
		} else if (article[3] !== NA) {
			str += "This article is issue " + article[3] + ". ";
		} else {
			str += "I'm sorry - I was unable to find the issue number of this article. ";
		}

	} else if (infoType === "volume") {
		if ((article[2] !== NA) && (article[1] !== NA)) {
			str += "This article is volume number " + article[2] + " in " + article[1] + ". ";
		} else if (article[2] !== NA) {
			str += "This article is volume number " + article[2] + ". ";
		} else {
			str += "I'm sorry - I was unable to find the volume number of this article. ";
		}

	} else if (infoType === "abstract") {
		if (article[9] !== NA) {
			str += 'Here is the abstract for your article - <break time="0.5s"/> '  + article[9];
		} else {
			str += "I'm sorry. There was no abstract available for me to retrieve. ";
		}

	} else if (infoType === "pub med id" || infoType === "pubmed id") {
		if (article[6] !== NA) {
			str += "The Pub Med I D for your article is - " + spellOut(article[6]);
		} else {
			// Should never reach this case, but it's here anyways
			str += "Unfortunately, I was unable to retrieve the Pub Med I D for the article. ";
		}

	} else {
		str = "I'm sorry. I couldn't understand what you were asking for. " + getTellMeThisHelpMessage();
	}

	// Store last speech
	this.attributes.repeatSpeech = str;
	this.emit(":ask", str);
}

function EMailIntentHandler() {
	var alexa = this;
	var article = this.attributes.publicationsArray[this.attributes.articleNumber - 1];
	var token = this.event.session.user.accessToken;
	var refreshToken = this.event.session.user.refreshToken;
	var text = "";
	var title = article[0] + " - PubMed Search"

if (this.event.session.user.refreshToken) {
	var refreshToken = this.event.session.user.refreshToken;
	console.log("REFRESH TOKEN: " +  refreshToken);
}

console.log("TOKEN: " + token);
	text += "Here is the article information you requested.\n\n"

	text += "Article title: " + article[0] + "\nJournal title: " + article[1] + "\nVolume: " + article[2] + ", Issue: " + article[3] +
					"\nISSN: " + article[4] + ", ISSN type: " + article[5] + "\nPubMed ID: " + article[6] + "\nAuthors: ";

	for (var i = 0; i < article[7].length; i++) {
		text += article[7][i] + " " + article[8][i];
		if (i !== article[7].length - 1) {
			text += ", ";
		}
	}

	text += "\nAbstract: " + article[9] + "\nDate published: " + returnFullDate(article[10][0], article[10][1], article[10][2]) +
					"\nDate received: " + returnFullDate(article[11][0], article[11][1], article[11][2]) + "\nDate revised: " +
					returnFullDate(article[12][0], article[12][1], article[12][2]) + "\nDate accepted: " + returnFullDate(article[13][0], article[13][1], article[13][2]) + "\n\n";

	text += "Thanks for using PubMed Search!"

	authorize(alexa, token, text, title, prepMail);
}

function authorize(alexa, token, text, title, callback) {
	var auth = new googleAuth();
	var oauth2Client = new auth.OAuth2(CLIENT_ID, CLIENT_SECRET, "");
	oauth2Client.credentials.access_token = token;
	oauth2Client.credentials.refresh_token = "";
	oauth2Client.credentials.token_type = "Bearer";
	oauth2Client.credentials.expiry_date = "";
	callback(alexa, oauth2Client, text, title, sendMail);
}

function prepMail(alexa, auth, text, title, callback) {
	var gmail = google.gmail("v1");
	gmail.users.getProfile({
		auth: auth,
		userId: "me"
	}, function(err, response) {
		if (err) {
			alexa.emit(":ask", "There was an error when trying to create your e-mail. Please try again.");
			console.log("Error prepping mail. ");
			console.log(util.inspect(err, false, null));
		} else {
			console.log(util.inspect(response, false, null));
			callback(alexa, auth, buildMail(response.emailAddress, text, title));
		}
	});
}

function buildMail(address, text, title) {
	var body = "To: <" + address + ">\nSubject: " + title + "\n\nContent-Type: text/html\n\n" + text;
	return new Buffer(body).toString("base64").replace(/\+/g, "-").replace(/\//g, "_");
}

function sendMail(alexa, auth, body) {
	var gmail = google.gmail("v1");
	gmail.users.messages.send({
		auth: auth,
		userId: "me",
		resource: {
			raw: body
		}
	}, function(err, response) {
		if (err) {
			alexa.emit(":ask", "There was an error when sending your message. Please try again.");
			console.log("There was an error in sending your message.");
			console.log(util.inspect(err, false, null));
		} else {
			alexa.emit(":ask", "Your e-mail was successfully sent.");
			console.log("Message successfully sent.");
			console.log(util.inspect(response, false, null));
		}
	});
}
// =====================================================================================================
// ------------------------------- Section 3. Generating Speech Messages -------------------------------
// =====================================================================================================

function getGenericHelpMessage() {
	return "I can help you find articles on the Pub Med database. Begin by searching for an article. " + getSearchHelpMessage() +
				 getSelectHelpMessage() + "After selecting an article, you can ask for information about it. " + getTellMeThisHelpMessage();
}

function getSearchHelpMessage() {
	var topics = ["anorexia", "acne cysts", "arthritis", "albumin", "aneurysms", "bacteria", "basal cells", "bladder cancer", "blood glucose",
								"chronic pancreatitis", "cancer prevention", "Chron's disease", "dandruff", "dental abscesses", "diphtheria", "dietary fat",
								"eczema", "epilepsy", "embryonic stem cells", "exercise", "facial pain", "folic acid", "first-degree burns", "fiber",
								"gluten intolerance", "gout symptons", "gram stains", "genetic testing", "glucose", "histamine", "heart failure", "heartburn",
								"influenza", "intestines", "jaundice", "Kawasaki disease", "knee replacement", "liver cancer", "laser acupuncture", "lactic acid",
								"mitral valves", "motion sickness", "mucus", "myopia", "neurotransmitters", "nicotine", "ovarian cancer", "osteoporosis", "pandemics",
								"pneumonia", "plaque", "restless legs syndrome", "rheumatic fever", "rabies", "stem cells", "strokes", "sickle cell disease",
								"toenail fungus", "tooth decay", "type 1 diabetes", "ultrasound", "vertigo", "vitamins", "warts", "Wilson disease", "yellow fever"];
	var searchPhrase = ["Give me articles about ", "Look for ", "Find articles about ", "Find ", "Find me articles about ", "Search for "];
	return "Examples of things you can say to search for articles are - " + searchPhrase[Math.floor(Math.random() * searchPhrase.length)] +
				 topics[Math.floor(Math.random() * topics.length)] + " - and " + searchPhrase[Math.floor(Math.random() * searchPhrase.length)] +
			 	 topics[Math.floor(Math.random() * topics.length)] + ". ";
}

function getSelectHelpMessage() {
	var select = ["Number ", "Article "];
	return "To get more information about an article, select an article number. For example, you can say - " +
				 select[Math.floor(Math.random() * select.length)] + Math.floor(Math.random() * 10) + ". ";
}

function getTellMeThisHelpMessage() {
	var whatPhrase = ["Tell me the ", "Give me the ", "What's the ", "What is the "];
	var infoType = ["title", "date", "author", "I S S N", "issue", "volume", "abstract"];
	return "Examples of things you can ask about an article include - " + whatPhrase[Math.floor(Math.random() * whatPhrase.length)] +
				 infoType[Math.floor(Math.random() * infoType.length)] + " - or " + whatPhrase[Math.floor(Math.random() * whatPhrase.length)] +
			 	 infoType[Math.floor(Math.random() * infoType.length)] + ". ";
}

function getEMailHelpMessage() {
	return "To link your account, you can visit Alexa dot Amazon dot com - or you can use the Alexa companion app. ";
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
function spellOut(toSpell) {
	var str = "";
	var arr;

	if (typeof toSpell !== "string") {
		toSpell = toSpell.toString();
	}

	arr = toSpell.replace(/-/g, "").split("");
	str += '<prosody rate="slow">';

	for (var i = 0; i < arr.length; i++) {
		str += arr[i] + " ";

		if ((i + 1) % 3 === 0) {
			str += '<break time="0.2s"/>';
		}
	}

	return str + '</prosody>';
}

function returnFullDate(year, month, day) {
	switch (parseInt(month)) {
		case 1:
			month = "January";
			break;
		case 2:
			month = "February";
			break;
		case 3:
			month = "March";
			break;
		case 4:
			month = "April";
			break;
		case 5:
			month = "May";
			break;
		case 6:
			month = "June";
			break;
		case 7:
			month = "July";
			break;
		case 8:
			month = "August";
			break;
		case 9:
			month = "September";
			break;
		case 10:
			month = "October";
			break;
		case 11:
			month = "November";
			break;
		case 12:
			month = "December";
			break;
		default:
			return "N/A";
	}

	if (day !== "") {
		return month + " " + day + "th, " + year;
	} else {
		return month + " " + year;
	}
}
