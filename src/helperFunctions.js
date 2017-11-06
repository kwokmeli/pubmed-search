"use strict";

const util = require("util");
const xml2js = require("xml2js");
const https = require("https");
const google = require("googleapis");
const googleAuth = require("google-auth-library");
var constants = require("./constants");

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

function returnDate(year, month, day, type) {
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

	if (type === "full") {
		if (day !== "") {
			return month + " " + day + "th, " + year;
		} else {
			return month + " " + year;
		}
	} else {
		if (day !== "") {
			return month + " " + day + ", " + year;
		} else {
			return month + " " + year;
		}
	}
}

function getArticle(articleNumber, publicationsArray, callback) {
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
				extractDetails(result, articleNumber, publicationsArray, function () {
					callback();
				});
			});
		});
	});
}

function extractDetails(result, article, publicationsArray, callback) {
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
		volume = issue = issn = issnType = constants.NA;
		// Retrieve book title if it exists
		// Check ArticleTitle first, BookTitle second
		if (result["PubmedArticleSet"]["PubmedBookArticle"][0]["BookDocument"][0]["ArticleTitle"]) {
			articleTitle = JSON.stringify(result["PubmedArticleSet"]["PubmedBookArticle"][0]["BookDocument"][0]["ArticleTitle"][0]["_"]).replace(/[\\\"\[\]]/g, "");
		} else if (result["PubmedArticleSet"]["PubmedBookArticle"][0]["BookDocument"][0]["Book"][0]["BookTitle"]) {
			articleTitle = JSON.stringify(result["PubmedArticleSet"]["PubmedBookArticle"][0]["BookDocument"][0]["Book"][0]["BookTitle"][0]["_"]).replace(/[\\\"\[\]]/g, "");
		} else {
			articleTitle = constants.NA;
		}

		// Retrieve book collection title if it exists
		if (result["PubmedArticleSet"]["PubmedBookArticle"][0]["BookDocument"][0]["Book"][0]["CollectionTitle"]) {
			journalTitle = result["PubmedArticleSet"]["PubmedBookArticle"][0]["BookDocument"][0]["Book"][0]["CollectionTitle"][0]["_"];
		} else {
			journalTitle = constants.NA;
		}

		// Retrieve publication date if it exists
		if (result["PubmedArticleSet"]["PubmedBookArticle"][0]["BookDocument"][0]["Book"][0]["PubDate"]) {
			let year, month, day;
			if (result["PubmedArticleSet"]["PubmedBookArticle"][0]["BookDocument"][0]["Book"][0]["PubDate"][0]["Year"]) {
				year = result["PubmedArticleSet"]["PubmedBookArticle"][0]["BookDocument"][0]["Book"][0]["PubDate"][0]["Year"][0];
			} else {
				year = constants.NA;
			}

			if (result["PubmedArticleSet"]["PubmedBookArticle"][0]["BookDocument"][0]["Book"][0]["PubDate"][0]["Month"]) {
				month = result["PubmedArticleSet"]["PubmedBookArticle"][0]["BookDocument"][0]["Book"][0]["PubDate"][0]["Month"][0];
			} else {
				month = constants.NA;
			}

			// TODO: Figure out how date is shown for book articles
			day = constants.NA;

			datePublished.push(JSON.stringify(year.replace(/[\\\"\[\]]/g, "")),
												 JSON.stringify(month.replace(/[\\\"\[\]]/g, "")),
												 JSON.stringify(day.replace(/[\\\"\[\]]/g, "")));
		}

		// Retrieve abstract if it exists
		if (result["PubmedArticleSet"]["PubmedBookArticle"][0]["BookDocument"][0]["Abstract"][0]["AbstractText"]) {
			abstract = result["PubmedArticleSet"]["PubmedBookArticle"][0]["BookDocument"][0]["Abstract"][0]["AbstractText"][0];
		} else {
			abstract = constants.NA;
		}

		// Retrieve all authors if they exist
		if (result["PubmedArticleSet"]["PubmedBookArticle"][0]["BookDocument"][0]["AuthorList"][0]["Author"]) {
			for (var i = 0; i < result["PubmedArticleSet"]["PubmedBookArticle"][0]["BookDocument"][0]["AuthorList"][0]["Author"].length; i++) {

				if (result["PubmedArticleSet"]["PubmedBookArticle"][0]["BookDocument"][0]["AuthorList"][0]["Author"][i]["ForeName"]) {
					authorsFirst.push(JSON.stringify(result["PubmedArticleSet"]["PubmedBookArticle"][0]["BookDocument"][0]["AuthorList"][0]["Author"][i]["ForeName"][0]).replace(/[\\\"\[\]]/g, ""));
				} else {
					authorsFirst.push(constants.NA);
				}

				if (result["PubmedArticleSet"]["PubmedBookArticle"][0]["BookDocument"][0]["AuthorList"][0]["Author"][i]["LastName"]) {
					authorsLast.push(JSON.stringify(result["PubmedArticleSet"]["PubmedBookArticle"][0]["BookDocument"][0]["AuthorList"][0]["Author"][i]["LastName"][0]).replace(/[\\\"\[\]]/g, ""));
				} else {
					authorsLast.push(constants.NA);
				}
			}
		} else {
			authorsFirst.push(constants.NA);
			authorsLast.push(constants.NA);
		}

	} else if (result["PubmedArticleSet"]["PubmedArticle"]) {
		// Retrieve journal title if it exists
		if (result["PubmedArticleSet"]["PubmedArticle"][0]["MedlineCitation"][0]["Article"][0]["Journal"][0]["Title"]) {
			journalTitle = JSON.stringify(result["PubmedArticleSet"]["PubmedArticle"][0]["MedlineCitation"][0]["Article"][0]["Journal"][0]["Title"]).replace(/[\\\"\[\]]/g, "");
		} else {
			journalTitle = constants.NA;
		}

		// Retrieve article title if it exists
		if (result["PubmedArticleSet"]["PubmedArticle"][0]["MedlineCitation"][0]["Article"][0]["ArticleTitle"]) {
			articleTitle = JSON.stringify(result["PubmedArticleSet"]["PubmedArticle"][0]["MedlineCitation"][0]["Article"][0]["ArticleTitle"]).replace(/[\\\"\[\]]/g, "");
		} else {
			articleTitle = constants.NA;
		}

		// Retrieve volume if it exists
		if (result["PubmedArticleSet"]["PubmedArticle"][0]["MedlineCitation"][0]["Article"][0]["Journal"][0]["JournalIssue"][0]["Volume"]) {
			volume = JSON.stringify(result["PubmedArticleSet"]["PubmedArticle"][0]["MedlineCitation"][0]["Article"][0]["Journal"][0]["JournalIssue"][0]["Volume"]).replace(/[\\\"\[\]]/g, "");
		} else {
			volume = constants.NA;
		}

		// Retrieve issue if it exists
		if (result["PubmedArticleSet"]["PubmedArticle"][0]["MedlineCitation"][0]["Article"][0]["Journal"][0]["JournalIssue"][0]["Issue"]) {
			issue = JSON.stringify(result["PubmedArticleSet"]["PubmedArticle"][0]["MedlineCitation"][0]["Article"][0]["Journal"][0]["JournalIssue"][0]["Issue"]).replace(/[\\\"\[\]]/g, "");
		} else {
			issue = constants.NA;
		}

		// Retrieve ISSN number if it exists
		if (result["PubmedArticleSet"]["PubmedArticle"][0]["MedlineCitation"][0]["Article"][0]["Journal"][0]["ISSN"][0]["_"]){
			issn = JSON.stringify(result["PubmedArticleSet"]["PubmedArticle"][0]["MedlineCitation"][0]["Article"][0]["Journal"][0]["ISSN"][0]["_"]).replace(/[\\\"\[\]]/g, "");
		} else {
			issn = constants.NA;
		}

		// Retrieve ISSN type if it exists
		if (result["PubmedArticleSet"]["PubmedArticle"][0]["MedlineCitation"][0]["Article"][0]["Journal"][0]["ISSN"][0]["$"]["IssnType"]) {
			issnType = JSON.stringify(result["PubmedArticleSet"]["PubmedArticle"][0]["MedlineCitation"][0]["Article"][0]["Journal"][0]["ISSN"][0]["$"]["IssnType"]).replace(/[\\\"\[\]]/g, "");
		} else {
			issnType = constants.NA;
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
			abstract = constants.NA;
		}

		// Retrieve all authors if they exist
		if (result["PubmedArticleSet"]["PubmedArticle"][0]["MedlineCitation"][0]["Article"][0]["AuthorList"]) {
			for (var i = 0; i < result["PubmedArticleSet"]["PubmedArticle"][0]["MedlineCitation"][0]["Article"][0]["AuthorList"][0]["Author"].length; i++) {
				var aff = [];

				if (result["PubmedArticleSet"]["PubmedArticle"][0]["MedlineCitation"][0]["Article"][0]["AuthorList"][0]["Author"][i]["ForeName"]) {
					authorsFirst.push(JSON.stringify(result["PubmedArticleSet"]["PubmedArticle"][0]["MedlineCitation"][0]["Article"][0]["AuthorList"][0]["Author"][i]["ForeName"]).replace(/[\\\"\[\]]/g, ""));
				} else {
					authorsFirst.push(constants.NA);
				}

				if (result["PubmedArticleSet"]["PubmedArticle"][0]["MedlineCitation"][0]["Article"][0]["AuthorList"][0]["Author"][i]["LastName"]) {
					authorsLast.push(JSON.stringify(result["PubmedArticleSet"]["PubmedArticle"][0]["MedlineCitation"][0]["Article"][0]["AuthorList"][0]["Author"][i]["LastName"]).replace(/[\\\"\[\]]/g, ""));
				} else {
					authorsLast.push(constants.NA);
				}

				// Affiliations include extraneous information
				// for (var j = 0; j < result["PubmedArticleSet"]["PubmedArticle"][0]["MedlineCitation"][0]["Article"][0]["AuthorList"][0]["Author"][i]["AffiliationInfo"].length; j++) {
				// 	aff.push(result["PubmedArticleSet"]["PubmedArticle"][0]["MedlineCitation"][0]["Article"][0]["AuthorList"][0]["Author"][i]["AffiliationInfo"][j]["Affiliation"]);
				// }
				// authorsAffiliation.push(aff);
			}
		} else {
			authorsFirst.push(constants.NA);
			authorsLast.push(constants.NA);
		}
	} else {
		console.log("New XML format, unable to read Pubmed Article " + article);
	}

	articleInformation.push(articleTitle, journalTitle, volume, issue, issn, issnType, article, authorsFirst, authorsLast, abstract, datePublished,
													dateReceived, dateRevised, dateAccepted);

	publicationsArray.push(articleInformation);
	callback();
}

function authorize(alexa, token, text, title, callback) {
	var auth = new googleAuth();
	var oauth2Client = new auth.OAuth2(constants.CLIENT_ID, constants.CLIENT_SECRET, "");
	// Provide access token; refresh token is passed to Alexa the very first time an accounting is linked with a Google account,
	// and Alexa will (should) stores the refresh token for you and exchanges it for a new access token when the previous one
	// has expired.
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
			alexa.emit(":ask", "There was an error when trying to create your e-mail. Please try again later.");
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
			alexa.emit(":ask", "There was an error when sending your message. Please try again later.");
			console.log("There was an error in sending your message.");
			console.log(util.inspect(err, false, null));
		} else {
			alexa.emit(":ask", "Your e-mail was successfully sent.");
			console.log("Message successfully sent.");
			console.log(util.inspect(response, false, null));
		}
	});
}

module.exports = {
  spellOut,
  returnDate,
	getArticle,
	extractDetails,
	authorize,
	prepMail,
	buildMail,
	sendMail
}
