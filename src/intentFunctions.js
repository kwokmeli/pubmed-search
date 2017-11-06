"use strict";

const util = require("util");
const https = require("https");

var constants = require("./constants");
var helperFunctions = require("./helperFunctions");
var speechGeneration = require("./speechGeneration");

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

  // URI encode the search term and append it to the search URL
	searchTerm = encodeURIComponent(searchTerm).replace(/'/g,"%27").replace(/"/g,"%22");
	searchURL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&retmode=json&retmax=" + constants.retMax + "&term=" + searchTerm;

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
					helperFunctions.getArticle(articles[j], publicationsArray, function () {
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
					alexa.handler.state = constants.states.DESCRIPTION;

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
					alexa.attributes.repeatSpeech = speech;

					alexa.emit(":ask", speech);
				}
			}
		});
	});
}


function selectIntentHandler() {
	var str = "";
	var articleNumber = this.event.request.intent.slots.AMAZON_NUMBER.value;

	if ((articleNumber >= 1) && (articleNumber <= constants.retMax)) {
		this.attributes.articleNumber = articleNumber;
		if (this.attributes.publicationsArray[articleNumber - 1][0] !== constants.NA) {
			str += "What would you like to know about article " + articleNumber + " - " + this.attributes.publicationsArray[articleNumber - 1][0] + "? ";
		} else {
			str += "What would you like to know about article " + articleNumber + "? ";
		}
		this.emit(":ask", str);
	} else {
		this.emit(":ask", "Articles are numbered 1 through " + constants.retMax + ". Please select a valid article.");
	}
}

function tellMeThisIntentHander() {
	var infoType = this.event.request.intent.slots.INFO_TYPE.value.toLowerCase();
	var article = this.attributes.publicationsArray[this.attributes.articleNumber - 1];
	var str = "";

	if (infoType === "title") {
		if (article[0] !== constants.NA && article[1] !== constants.NA) {
			str += "The title of your requested article is - " + article[0] +
						 " - and it was published in " + article[1] + ". ";
		} else if (article[0] !== constants.NA) {
			str += "The title of your requested article is - " + article[0] + ". Unfortunately, I could not find the name of the journal it was published in. ";
		} else if (article[1] !== constants.NA) {
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
				str += "The article was received " + helperFunctions.returnDate(article[11][0], article[11][1], article[11][2], "full") + " - revised " +
							 helperFunctions.returnDate(article[12][0], article[12][1], article[12][2], "full") + " - and accepted " + helperFunctions.returnDate(article[13][0], article[13][1], article[13][2], "full") + ". ";
			} else if ((article[11].length !== 0) && (article[12].length !== 0)) {
				str += "However, I did find dates for when the article was received and revised. ";
				str += "The article was received " + helperFunctions.returnDate(article[11][0], article[11][1], article[11][2], "full") + " - and revised " +
							 helperFunctions.returnDate(article[12][0], article[12][1], article[12][2], "full") + ". ";
			} else if ((article[11].length !== 0) && (article[13].length !== 0)) {
				str += "However, I did find dates for when the article was received and accepted. ";
				str += "The article was received " + helperFunctions.returnDate(article[11][0], article[11][1], article[11][2], "full") + " - and accepted " +
							 helperFunctions.returnDate(article[13][0], article[13][1], article[13][2], "full") + ". ";
			} else if ((article[12].length !== 0) && (article[13].length !== 0)) {
				str += "However, I did find dates for when the article was revised and accepted. ";
				str += "The article was revised " + helperFunctions.returnDate(article[12][0], article[12][1], article[12][2], "full") + " - and accepted " +
							 helperFunctions.returnDate(article[13][0], article[13][1], article[13][2], "full") + ". ";
			} else if (article[11].length !== 0) {
				str += "However, I did find a date for when the article was received. ";
				str += "The article was received " + helperFunctions.returnDate(article[11][0], article[11][1], article[11][2], "full") + ". ";
			} else if (article[12].length !== 0) {
				str += "However, I did find a date for when the article was revised. ";
				str += "The article was revised " + helperFunctions.returnDate(article[12][0], article[12][1], article[12][2], "full") + ". ";
			} else if (article[13].length !== 0) {
				str += "However, I did find a date for when the article was accepted. ";
				str += "The article was accepted " + helperFunctions.returnDate(article[13][0], article[13][1], article[13][2], "full") + ". ";
			} else {
				str += "In addition, I was unable to find a date for when the article was received, revised, or accepted. "
			}

		} else {
			str += "The article was published " + helperFunctions.returnDate(article[10][0], article[10][1], article[10][2], "full") + ". ";

			if ((article[11].length !== 0) && (article[12].length !== 0) && (article[13].length !== 0)) {
				str += "In addition, I found dates for when the article was received, revised, and accepted. ";
				str += "The article was received " + helperFunctions.returnDate(article[11][0], article[11][1], article[11][2], "full") + " - revised " +
							 helperFunctions.returnDate(article[12][0], article[12][1], article[12][2], "full") + " - and accepted " + helperFunctions.returnDate(article[13][0], article[13][1], article[13][2], "full") + ". ";
			} else if ((article[11].length !== 0) && (article[12].length !== 0)) {
				str += "In addition, I found dates for when the article was received and revised. ";
				str += "The article was received " + helperFunctions.returnDate(article[11][0], article[11][1], article[11][2], "full") + " - and revised " +
							 helperFunctions.returnDate(article[12][0], article[12][1], article[12][2], "full") + ". ";
			} else if ((article[11].length !== 0) && (article[13].length !== 0)) {
				str += "In addition, I found dates for when the article was received and accepted. ";
				str += "The article was received " + helperFunctions.returnDate(article[11][0], article[11][1], article[11][2], "full") + " - and accepted " +
							 helperFunctions.returnDate(article[13][0], article[13][1], article[13][2], "full") + ". ";
			} else if ((article[12].length !== 0) && (article[13].length !== 0)) {
				str += "In addition, I found dates for when the article was revised and accepted. ";
				str += "The article was revised " + helperFunctions.returnDate(article[12][0], article[12][1], article[12][2], "full") + " - and accepted " +
							 helperFunctions.returnDate(article[13][0], article[13][1], article[13][2], "full") + ". ";
			} else if (article[11].length !== 0) {
				str += "In addition, I found a date for when the article was received. ";
				str += "The article was received " + helperFunctions.returnDate(article[11][0], article[11][1], article[11][2], "full") + ". ";
			} else if (article[12].length !== 0) {
				str += "In addition, I found a date for when the article was revised. ";
				str += "The article was revised " + helperFunctions.returnDate(article[12][0], article[12][1], article[12][2], "full") + ". ";
			} else if (article[13].length !== 0) {
				str += "In addition, I found a date for when the article was accepted. ";
				str += "The article was accepted " + helperFunctions.returnDate(article[13][0], article[13][1], article[13][2], "full") + ". ";
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
		if (article[4] !== constants.NA) {
			str += "The I S S N number for this publication is " + helperFunctions.spellOut(article[4]) + ". "
		}

		if (article[5] !== constants.NA) {
			str += "The I S S N type is " + article[5] + ". ";
		}

	} else if (infoType === "issue") {
		if ((article[3] !== constants.NA) && (article[1] !== constants.NA)) {
			str += "This article is issue " + article[3] + " in " + article[1] + ". ";
		} else if (article[3] !== constants.NA) {
			str += "This article is issue " + article[3] + ". ";
		} else {
			str += "I'm sorry - I was unable to find the issue number of this article. ";
		}

	} else if (infoType === "volume") {
		if ((article[2] !== constants.NA) && (article[1] !== constants.NA)) {
			str += "This article is volume number " + article[2] + " in " + article[1] + ". ";
		} else if (article[2] !== constants.NA) {
			str += "This article is volume number " + article[2] + ". ";
		} else {
			str += "I'm sorry - I was unable to find the volume number of this article. ";
		}

	} else if (infoType === "abstract") {
		if (article[9] !== constants.NA) {
			str += 'Here is the abstract for your article - <break time="0.5s"/> '  + article[9];
		} else {
			str += "I'm sorry. There was no abstract available for me to retrieve. ";
		}

	} else if (infoType === "pub med id" || infoType === "pubmed id") {
		if (article[6] !== constants.NA) {
			str += "The Pub Med I D for your article is - " + helperFunctions.spellOut(article[6]);
		} else {
			// Should never reach this case, but it's here anyways
			str += "Unfortunately, I was unable to retrieve the Pub Med I D for the article. ";
		}

	} else {
		str = "I'm sorry. I couldn't understand what you were asking for. " + speechGeneration.getTellMeThisHelpMessage();
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

	text += "Here is the article information you requested.\n\n"

	text += "Article title: " + article[0] + "\nJournal title: " + article[1] + "\nVolume: " + article[2] + ", Issue: " + article[3] +
					"\nISSN: " + article[4] + ", ISSN type: " + article[5] + "\nPubMed ID: " + article[6] + "\nAuthors: ";

	for (var i = 0; i < article[7].length; i++) {
		text += article[7][i] + " " + article[8][i];
		if (i !== article[7].length - 1) {
			text += ", ";
		}
	}

	text += "\nAbstract: " + article[9] + "\nDate published: " + helperFunctions.returnDate(article[10][0], article[10][1], article[10][2], "abbr") +
					"\nDate received: " + helperFunctions.returnDate(article[11][0], article[11][1], article[11][2], "abbr") + "\nDate revised: " +
					helperFunctions.returnDate(article[12][0], article[12][1], article[12][2], "abbr") + "\nDate accepted: " + helperFunctions.returnDate(article[13][0], article[13][1], article[13][2], "abbr") + "\n\n";

	text += "Thanks for using PubMed Search!"

	helperFunctions.authorize(alexa, token, text, title, helperFunctions.prepMail);
}

module.exports = {
  searchIntentHandler,
  selectIntentHandler,
  tellMeThisIntentHander,
  EMailIntentHandler
}
