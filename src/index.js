import { connect } from "mqtt";
import { createInterface } from "readline";

import { InfluxDB, Point } from '@influxdata/influxdb-client'

const influxDB = new InfluxDB({ url: "http://172.28.106.26:8086/", token: "3e5c10cb91b82e42d89fa95267e8c40b33a387e54d7f895eec5ff854804d3696" })
const writeClient = influxDB.getWriteApi("my-org", "my-bucket", "s");

const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
})

const client = connect("mqtt://localhost:1883");

client.on("connect", () => {
    client.subscribe("#", (err) => {
        if (!err) {
            console.log("Subscribed to all topics");
        } else {
            console.error("Error subscribing to topic:", err);
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
    // message is Buffer
    console.log("Topic: " + topic.toString());
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

        for (let key of Object.keys(jsonMessage)) {
            console.log(typeof jsonMessage[key]);
            let point = new Point(`${key}`)
                .tag('location', topicStrings[0])
                .tag('station', topicStrings[1])
                .floatField('value', jsonMessage[key])
                .timestamp()

            writeClient.writePoint(point);
            writeClient.flush();
            console.log("Write completed");
        }
    }


});



rl.on("SIGINT", () => {
    console.log("Closing MQTT client");
    client.end();
    process.exit();
});