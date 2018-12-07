const express = require('express');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.urlencoded({"extended": true}));
app.use(bodyParser.json());

const conversationName = 'selective-audio-demo';
const participants = {
  "<supervisor_phone_number>": {
    "role": "supervisor",
  },
  "<agent_phone_number>": {
    "role": "agent",
  },
  "<customer_phone_number>": {
    "role": "customer",
  }
};

app.post('/webhooks/event', (req, res) => {
    console.log(req.body);
    res.send("");
});

app.get('/webhooks/answer', (req, res) => {
    let caller = participants[req.query.from];

    if (!caller) {
        return res.status(400).json("Unknown caller type: " + req.query.from);
    }

    // Add their leg ID to the caller
    caller.legId = req.query.uuid;

    // Generate an NCCO based on role
    let ncco;
    switch (caller.role) {
        case 'supervisor':
            ncco = createSupervisorNcco(caller);
            break;
        case 'agent':
            ncco = createAgentNcco(caller);
            break;
        case 'customer':
            ncco = createCustomerNcco(caller);
            break;
        default:
            return res.status(400).json("Unknown caller type: " + caller.type);

    }
    return res.json(ncco);
});

app.listen(3000, () => {
    console.log('Listening');
});

function createCustomerNcco(caller){
    // Customer can hear agent, and speak to everyone
    return [
        {
            "action": "conversation",
            "name": conversationName,
            "startOnEnter": false,
            "musicOnHoldUrl": ["https://nexmo-community.github.io/ncco-examples/assets/voice_api_audio_streaming.mp3"],
            "canSpeak": findParticipants('agent').concat(findParticipants('supervisor')),
            "canHear": findParticipants('agent')
        }
    ]
}

function createAgentNcco(caller){
    // Agent can hear everyone, and speak to everyone
    return [
        {
            "action": "conversation",
            "name": conversationName,
            "startOnEnter": true,
            "record": true,
            "canSpeak": findParticipants('customer').concat(findParticipants('supervisor')),
            "canHear": findParticipants('customer').concat(findParticipants('supervisor'))
        }
    ]
}

function createSupervisorNcco(caller){
    // Supervisor can hear everyone, but only speak to agents
    return [
        {
            "action": "conversation",
            "name": conversationName,
            "startOnEnter": false,
            "musicOnHoldUrl": ["https://nexmo-community.github.io/ncco-examples/assets/voice_api_audio_streaming.mp3"],
            "canSpeak": findParticipants('agent'),
            "canHear": findParticipants('customer').concat(findParticipants('agent'))
        }
    ]
}

function findParticipants(callerType) {
    let legs = [];
    Object.entries(participants).forEach(([number, participant]) => {
        if (participant.role == callerType && participant.legId) {
            legs.push(participant.legId);
        }
    });

    return legs;
}
