import { connect } from "mqtt";
import { createInterface } from "readline";

const topics = [{ location: "UPB", stations: ["RPi_1", "RPi_2"] }, { location: "Dorinel", stations: ["Zeus1", "Zeus2"] }];

const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
})

const client = connect("mqtt://localhost:1883");

client.on("connect", () => {
    client.subscribe("#", (err) => {
        if (!err) {
            console.log("Subscribed to all topics");
            ask();
        } else {
            console.error("Error subscribing to topic:", err);
            process.exit(1); // Exit the application if subscription fails
        }
    });
});

function ask() {
    rl.question("", (answer) => {
        if (answer.trim() !== "") {

            const location = topics[Math.floor(Math.random() * topics.length)];
            const station = location.stations[Math.floor(Math.random() * location.stations.length)];



            client.publish(`${location.location}/${station}`, answer, (err) => {
                if (err) {
                    console.error("Error publishing message:", err);
                } else {
                    console.log("Message published");
                }
                ask(); // Continue reading input
            });
        } else {
            ask(); // Continue reading input if the message is empty
        }
    });
}



rl.on("SIGINT", () => {
    console.log("Closing MQTT client");
    client.end();
    process.exit();
});