class MqttModel {

    async handleDeviceLog(id, payload) {
        console.log(id, payload, "<<log");

    }

}

export const mqttModel = new MqttModel()