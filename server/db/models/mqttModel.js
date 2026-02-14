import { mqttClient } from '../../mqtt/mqttClient.js';
class MqttModel {

    // Handle data from sensors
    async handleDeviceMessage(id, payload) {
        console.log(`Device ${id} message:`, payload);
    }

    // MQTT Requests
    async checkIfSunny(id) {
        //id of the pot to send the mqtt request to get the sunny data from the sensor
        return true
    }

    async turnOn(req, res, next) {
        const topic = `pot/${req.params.id}/command`;
        mqttClient.publish(topic, JSON.stringify({ action: "on" }));

        return res.status(200).json({ message: "Turn on command sent successfully" });
    }

    async turnOff(req, res, next) {
        // TODO: Send MQTT message to turn off the device
        console.log(`Turning off device with ID: ${req.params.id}`);
        next();
    }

    async setScheduled(req, res, next) {
        // TODO: Send MQTT message with schedule configuration
        console.log(`Setting schedule for device with ID: ${req.params.id}`);
        const { startHour, startMinute, endHour, endMinute, days } = req.body;
        console.log(`Schedule: ${startHour}:${startMinute} - ${endHour}:${endMinute}, Days: ${JSON.stringify(days)}`);

        return res.status(200).json({ message: "Schedule set command sent successfully" });
    }

    async changePotMode(req, res, next) {
        const { id } = req.params;
        const { mode } = req.body;
        const topic = `pot/${id}/command`;
        mqttClient.publish(topic, JSON.stringify({ action: "change_mode", mode }));

        return res.status(200).json({ message: "Mode change command sent successfully" });
    }

}

export const mqttModel = new MqttModel()