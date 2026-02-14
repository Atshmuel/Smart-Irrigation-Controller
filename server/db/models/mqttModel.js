import { mqttClient } from '../../mqtt/mqttClient.js';
import { pool } from '../dbConnection.js';

class MqttModel {

    // Handle data from sensors
    async handleDeviceMessage(id, payload) {
        console.log(`Device ${id} message:`, payload);
    }

    // Handle pot status updates from Arduino (when mode is not manual)
    async handlePotStatusUpdate(potId, payload) {
        try {
            const { status } = payload; // status: true (on) or false (off)
            const newStatus = status === true || status === 1;

            // Update pot status in database
            await pool.query(
                'UPDATE pots SET status = ? WHERE id = ?',
                [newStatus, potId]
            );

            // If turning on, create a watering event
            if (newStatus) {
                await pool.query(
                    'INSERT INTO watering_events (pot_id, start_time) VALUES (?, NOW())',
                    [potId]
                );
                console.log(`Pot ${potId} turned on by Arduino`);
            } else {
                // If turning off, end any active watering event
                const [row] = await pool.query(
                    `SELECT id, start_time 
                 FROM watering_events 
                 WHERE pot_id = ? AND end_time IS NULL 
                 ORDER BY start_time DESC 
                 LIMIT 1`,
                    [potId]
                );

                if (row.length > 0) {
                    const event = row[0];
                    await pool.query(
                        `UPDATE watering_events
                        SET end_time = NOW(),
                        duration_seconds = TIMESTAMPDIFF(SECOND, start_time, NOW())
                        WHERE id = ?`,
                        [event.id]
                    );
                }
                console.log(`Pot ${potId} turned off by Arduino`);
            }
        } catch (error) {
            console.error(`Error handling pot status update for pot ${potId}:`, error);
        }
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
        const { mode, status } = req.body;
        const topic = `pot/${id}/command`;
        mqttClient.publish(topic, JSON.stringify({ action: "change_mode", mode, status }));

        return res.status(200).json({ message: "Mode change command sent successfully" });
    }

}

export const mqttModel = new MqttModel()