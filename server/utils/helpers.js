import { mqttModel } from "../db/models/mqttModel";

export async function isRecommandedTimeToUse() {
    try {
        const now = new Date();
        const currHour = now.getHours();

        //noon hours not recommanded to turn on
        if (currHour >= 12 && currHour <= 18)
            return false;

        //else check if sunny data will be returned from the sensor 
        return await mqttModel.checkIfSunny()
    } catch (error) {
        console.log(error);
        return false
    }

}