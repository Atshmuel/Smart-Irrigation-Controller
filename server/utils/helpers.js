import { mqttModel } from "../db/models/mqttModel.js";

export async function isRecommandedTimeToUse(id) {
    try {
        const now = new Date();
        const currHour = now.getHours();

        //noon hours not recommanded to turn on
        if (currHour >= 12 && currHour <= 18)
            return false;

        //else check if sunny data will be returned from the sensor 
        const isSunny = await mqttModel.checkIfSunny(id);

        return !isSunny; // If it's sunny, it's not recommended to turn on
    } catch (error) {
        console.log(error);
        return false
    }

}
