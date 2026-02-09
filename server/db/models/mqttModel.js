class MqttModel {

    // Handle data from sensors
    async handleDeviceMessage(id, payload) {
        console.log(`Device ${id} message:`, payload);
    }

    // MQTT Requests
    async checkIfSunny() {
        // TODO: Implement actual sensor data checking
        return true
    }

    async turnOn(req, res, next) { 
        // TODO: Send MQTT message to turn on the device
        console.log(`Turning on device with ID: ${req.params.id}`);
        next();
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
        next();
    }

}

export const mqttModel = new MqttModel()