const express = require('express');
const app = express();
const http = require('http').createServer(app);
const options = {
  /* ... */
};

const io = require('socket.io')(http, options);
const _ = require('lodash');

app.use('/', express.static('public'));

io.on('connection', socket => {
  console.log('a user connected');
  tempNoteParams[socket.id] = {};
  socket.on('instruction', data => {
    const projectId = 'synth-assistant';
    const sessionId = socket.id;
    let queries = [data];
    executeQueries(projectId, sessionId, queries, languageCode);
  });
  socket.on('disconnect', () => {
    console.log('user disconnected');
  });
});

let tempNoteParams = {};
let noteParams = {
  ready: false,
};
let queue = [];
let queueActive = false;

const listener = http.listen(process.env.PORT || 3000, process.env.IP, () => {
  console.log('listening on *:3000');
});

// languageCode: Indicates the language Dialogflow agent should use to detect intents
const languageCode = 'en';

// Imports the Dialogflow library
const dialogflow = require('@google-cloud/dialogflow');

// Instantiates a session client
const sessionClient = new dialogflow.SessionsClient();

async function detectIntent(
  projectId,
  sessionId,
  query,
  contexts,
  languageCode
) {
  // The path to identify the agent that owns the created intent.
  const sessionPath = sessionClient.projectAgentSessionPath(
    projectId,
    sessionId
  );

  // The text query request.
  const request = {
    session: sessionPath,
    queryInput: {
      text: {
        text: query,
        languageCode: languageCode,
      },
    },
  };

  if (contexts && contexts.length > 0) {
    request.queryParams = {
      contexts: contexts,
    };
  }

  const responses = await sessionClient.detectIntent(request);
  return responses[0];
}

async function executeQueries(projectId, sessionId, queries, languageCode) {
  // Keeping the context across queries let's us simulate an ongoing conversation with the bot
  let context;
  let intentResponse;
  for (const query of queries) {
    try {
      console.log(`Sending Query: ${query}`);
      intentResponse = await detectIntent(
        projectId,
        sessionId,
        query,
        context,
        languageCode
      );
      console.log('Detected intent');
      console.log(intentResponse.queryResult);
      if (
        intentResponse.queryResult.action ==
          'capabilities.capabilities-yes.frequency-return' &&
        intentResponse.queryResult.allRequiredParamsPresent
      ) {
        console.log(
          'got frequency! ' +
            intentResponse.queryResult.parameters.fields.number.numberValue
        );
        tempNoteParams[sessionId].freq =
          intentResponse.queryResult.parameters.fields.number.numberValue;
      }
      if (
        intentResponse.queryResult.action ==
          'capabilities.capabilities-yes.frequency-return.wave-return' &&
        intentResponse.queryResult.allRequiredParamsPresent
      ) {
        console.log(
          'got waveform! ' +
            intentResponse.queryResult.parameters.fields.waveshape.stringValue
        );

        tempNoteParams[sessionId].waveshape =
          intentResponse.queryResult.parameters.fields.waveshape.stringValue;
        cueSound(sessionId);
      }
      if (
        intentResponse.queryResult.action == 'fastnote' &&
        intentResponse.queryResult.allRequiredParamsPresent
      ) {
        tempNoteParams[sessionId].freq =
          intentResponse.queryResult.parameters.fields.number.numberValue;
        tempNoteParams[sessionId].waveshape =
          intentResponse.queryResult.parameters.fields.waveshape.stringValue;
        cueSound(sessionId);
      }
      console.log(
        `Fulfillment Text: ${intentResponse.queryResult.fulfillmentText}`
      );
      io.to(sessionId).emit(
        'reply',
        intentResponse.queryResult.fulfillmentText
      );
      // Use the context from this response for next queries
      context = intentResponse.queryResult.outputContexts;
    } catch (error) {
      console.log(error);
    }
  }
}

function cueSound(id) {
  tempNoteParams[id].ready = true;
  let temp = JSON.parse(JSON.stringify(tempNoteParams[id]));
  queue.push(temp);
  console.log(queue);
}

app.get('/getnote', function (req, res) {
  if (!queueActive && queue.length > 0) {
    scheduleNotes();
  }

  res.send(noteParams);

  noteParams = {
    ready: false,
  };
});

console.log('test');

function scheduleNotes() {
  queueActive = true;
  noteParams = queue[0];
  queue.shift();
  console.log(queue);
  setTimeout(() => {
    if (queue.length > 0) {
      scheduleNotes();
    } else {
      queueActive = false;
    }
  }, 10000);
}
