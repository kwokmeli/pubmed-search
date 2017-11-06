"use strict";

module.exports = Object.freeze({
  states: {
  	SEARCHMODE: "_SEARCHMODE",
  	DESCRIPTION: "_DESCRIPTION"
  },

  NA: "N/A",
  retMax: 10,

  // App ID for mkwok
  APP_ID: "amzn1.ask.skill.6c3b5cbf-71ab-470b-b440-adcc95f0e70d",

  CLIENT_ID: "1008286386485-aot4ak0kmniui967avelk9497mapkjq3.apps.googleusercontent.com",
  CLIENT_SECRET: "FIstk8ZgQ1w3DlMZi-riSkSF",

  // This is the welcome message for when a user starts the skill without a specific intent.
  WELCOME_MESSAGE: "Welcome to Pub Med Search. To get started, search for a topic of interest. If you ever need help, just say - I need help. ",

  // This is the message a user will hear when they ask Alexa for help in your skill.
  HELP_MESSAGE: "I can help you find articles from the Pub Med database. ",

  // This is the message a user will hear when they begin a new search
  NEW_SEARCH_MESSAGE: "To start a new search, you can say - find me articles about dentistry. ",

  // This is the message a user will hear when they ask Alexa for help while in the SEARCH state
  SEARCH_STATE_HELP_MESSAGE: "To search for articles, you can say - find me articles about cancer. ",

  // This is the message use when the decides to end the search
  SHUTDOWN_MESSAGE: "Ok. ",

  // This is the message a user will hear when they try to cancel or stop the skill.
  EXIT_SKILL_MESSAGE: "Ok. "
});
