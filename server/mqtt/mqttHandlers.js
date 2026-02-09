

export async function handleMqttMessage(topic, payload) {

    const topicParts = topic.split("/"); // pot/<id>/update/<type>
    if (topicParts.length !== 4) {
        console.warn("Unknown topic format:", topic);
        return;
    }

    const id = topicParts[1];
    const type = topicParts[3];
    switch (type) {
        case 'log':
            await mqttModel.handleDeviceMessage(id, payload)
            break;
        default:
            console.log("unknown type:", type);
            break;
    }
}
