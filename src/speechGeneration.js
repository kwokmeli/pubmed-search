"use strict";
const util = require("util");

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

module.exports = {
  getGenericHelpMessage,
  getSearchHelpMessage,
  getSelectHelpMessage,
  getTellMeThisHelpMessage,
  getEMailHelpMessage
}
