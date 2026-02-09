class MqttModel {

    //handle data from sensors
    async handleDeviceMessage(id, payload) {
        console.log(id, payload, "<<log");
    }

    //mqtt Requests
    async checkIfSunny() {
        return true
    }

    async turnOn() { }

    async turnOff() { }

    async setScheduled() { }

}

export const mqttModel = new MqttModel()