import { connect } from "mqtt";
import { createInterface } from "readline";

import { InfluxDB, Point } from '@influxdata/influxdb-client'

const influxDB = new InfluxDB({ url: "http://influxdb:8086/", token: process.env.DOCKER_INFLUXDB_INIT_ADMIN_TOKEN })
const writeClient = influxDB.getWriteApi(process.env.DOCKER_INFLUXDB_INIT_ORG, process.env.DOCKER_INFLUXDB_INIT_BUCKET, "s");

const logInfo = (message) => {
    if (process.env.DEBUG_DATA_FLOW) {
        console.log(message);
    }
}

const logError = (message) => {
    if (process.env.DEBUG_DATA_FLOW) {
        console.error(message);
    }
}

const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
})

const client = connect("mqtt://mqtt_broker:1883");

client.on("connect", () => {
    client.subscribe("#", (err) => {
        if (!err) {
            logInfo("Adapter has started. Subscribed to all topics");
        } else {
            logError("Error subscribing to all topics:", err);
            process.exit(1); // Exit the application if subscription fails
        }
    });
});

function isJsonString(str) {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
}


client.on("message", (topic, message) => {
    logInfo("Received a message by topic: " + topic.toString());
    const messageString = message.toString();

    if (!isJsonString(messageString)) {
        logError("Invalid message format. Please provide a JSON format that includes the data.");
        return;
    }

    const jsonMessage = JSON.parse(message.toString());


    if (Object.keys(jsonMessage).length === 0 || (Object.keys(jsonMessage).length === 1 && Object.keys(jsonMessage).includes("timestamp"))) {
        logError("JSON Message could not be empty or have only timestamp field.");
        return;
    }


    let topicStrings = topic.split("/");

    // Check if the topic structure is valid
    if (topicStrings.length > 2) {
        logInfo("Invalid message. Wrong location/station format");
        return;
    }

    // Check if the timestamp key is present and set the time
    let currentTimestamp = new Date();
    let timestampKey = false;

    // Change timestamp
    for (let key of Object.keys(jsonMessage)) {
        if (key === "timestamp") {
            timestampKey = true;
            currentTimestamp = new Date(jsonMessage[key]);
        }
    }

    if (isNaN(currentTimestamp)) {
        logError("Provided timestamp is invalid.");
        return;
    }

    if (timestampKey) {
        logInfo("Data timestamp is " + currentTimestamp);
    } else {
        logInfo("Data timestamp is NOW");
    }


    // Add new point for each valid key
    for (let key of Object.keys(jsonMessage)) {
        if (key !== "timestamp" && typeof jsonMessage[key] === "number") {
            try {
                let point = new Point(`${key}`)
                    .tag('location', topicStrings[0])
                    .tag('station', topicStrings[1])
                    .floatField('value', jsonMessage[key])
                    .timestamp(currentTimestamp)

                writeClient.writePoint(point);
                logInfo(`${topicStrings[0]}.${topicStrings[1]}.${key} ${jsonMessage[key]} `);
            } catch (err) {
                logError("Error in writing points to the database " + err);
                return;
            }
        }
    }

});


rl.on("SIGINT", () => {
    logInfo("Closing MQTT client");
    client.end();
    process.exit();
});