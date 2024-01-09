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

    if (isJsonString(messageString)) {
        const jsonMessage = JSON.parse(message.toString());
        console.log(jsonMessage);
        let topicStrings = topic.split("/");
        console.log(topicStrings);


        if (topicStrings.length > 2) {
            console.log("Invalid message. Wrong location/station format");
            return;
        }

        let currentTimestamp = new Date();

        for (let key of Object.keys(jsonMessage)) {
            if (key === "timestamp") {
                currentTimestamp = new Date(jsonMessage[key]);
                logInfo("Data timestamp is " + currentTimestamp);
            } else {
                logInfo("Data timestamp is NOW");
            }
        }


        for (let key of Object.keys(jsonMessage)) {
            if (key !== "timestamp" && typeof jsonMessage[key] === "number") {
                let point = new Point(`${key}`)
                    .tag('location', topicStrings[0])
                    .tag('station', topicStrings[1])
                    .floatField('value', jsonMessage[key])
                    .timestamp(currentTimestamp)

                try {
                    writeClient.writePoint(point);
                    writeClient.flush();
                    logInfo(`${topicStrings[0]}.${topicStrings[1]}.${key} ${jsonMessage[key]} `);
                    logInfo("");
                } catch (err) {
                    logError("Error in writing points to the database " + err);
                }
            }
        }
    }


});


rl.on("SIGINT", () => {
    logInfo("Closing MQTT client");
    client.end();
    process.exit();
});