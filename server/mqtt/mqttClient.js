import mqtt from "mqtt";
import { handleMqttMessage } from "./mqttHandlers.js";
import { POT_UPDATE } from './mqttTopics.js'

export const mqttClient = mqtt.connect("mqtt://broker.hivemq.com:1883", {
    clientId: "smart_pots_server_" + Math.random().toString(16).slice(2),
    protocolVersion: 4,
    connectTimeout: 5000,
    reconnectPeriod: 1000,
});

export function initMqtt() {
    mqttClient.on("connect", () => {
        console.log("Connected to MQTT broker");
        mqttClient.subscribe(POT_UPDATE, { qos: 1 }, (err) => {
            if (err) console.error("Subscribe error:", err);
            else console.log("Subscribed to ", POT_UPDATE);
        });
    });

    mqttClient.on("message", async (topic, message) => {
        try {
            const payload = JSON.parse(message.toString());
            await handleMqttMessage(topic, payload);
        } catch (err) {
            console.error("Invalid message format:", err);
        }
    });

}


/* MQTT pub example:

mosquitto_pub -h broker.hivemq.com -t "pot/1/update/status" -m '{"status": true}'
mosquitto_pub -h broker.hivemq.com -t "pot/1/update/status" -m '{"status": false}'

mosquitto_pub -h broker.hivemq.com -t "pot/1/update/log" -m '{"temperature": 25.5, "humidity": 60, "soil_moisture": 40, "light_level": 800, "current_mode": "manual"}'

for dubugging:
mosquitto_sub -h broker.hivemq.com -t "pot/1/#" -v


*/
