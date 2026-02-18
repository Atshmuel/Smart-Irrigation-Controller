import { mqttClient } from '../../mqtt/mqttClient.js';
import { pool } from '../dbConnection.js';

class MqttModel {
    // Handle data from sensors
    async handleSensorsData(id, payload) {
        console.log(`Device ${id} message:`, payload);
        try {
            const { temperature, humidity, soil_moisture, light_level, current_mode } = payload;
            await pool.query(
                'INSERT INTO logs (pot_id, temperature, humidity, soil_moisture, light_level, current_mode) VALUES (?, ?, ?, ?, ?, ?)',
                [id, temperature, humidity, soil_moisture, light_level, current_mode]
            );
        } catch (error) {
            console.error(`Error handling device message for pot ${id}:`, error);
        }
    }

    // Handle pump log updates from Arduino (when mode is manual)
    async handlePumpLog(id, payload) {
        try {
            const { water_consumed_liters } = payload; // action: "on" or "off"
            const [row] = await pool.query(
                `SELECT id, start_time 
                 FROM watering_events 
                 WHERE pot_id = ? AND end_time IS NULL 
                 ORDER BY start_time DESC 
                 LIMIT 1`,
                [id]
            );

            if (row.length > 0) {
                const event = row[0];
                await pool.query(
                    `UPDATE watering_events
                        SET end_time = NOW(),
                        duration_seconds = TIMESTAMPDIFF(SECOND, start_time, NOW()),
                        water_consumed_liters = ?
                        WHERE id = ?`,
                    [water_consumed_liters, event.id]
                );
            }
        } catch (error) {

        }
    }

    // Handle pot status updates from Arduino (when mode is not manual)
    async handlePotStatusUpdate(potId, payload) {
        try {
            const { status, water_consumed_liters } = payload; // status: true (on) or false (off)
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
                        duration_seconds = TIMESTAMPDIFF(SECOND, start_time, NOW()),water_consumed_liters = ?
                        WHERE id = ?`,
                        [water_consumed_liters, event.id]
                    );
                }
                console.log(`Pot ${potId} turned off by Arduino`);
            }
        } catch (error) {
            console.error(`Error handling pot status update for pot ${potId}:`, error);
        }
    }



    async turnOn(req, res, next) {
        const topic = `pot/${req.params.id}/command`;
        mqttClient.publish(topic, JSON.stringify({ action: "on" }));
        if (res && res.headersSent) {
            if (typeof next === 'function') return next();
            return;
        }
        return res.status(200).json({ message: "Turn on command sent successfully" });
    }

    async turnOff(req, res, next) {
        const topic = `pot/${req.params.id}/command`;
        mqttClient.publish(topic, JSON.stringify({ action: "off" }));
        if (res && res.headersSent) {
            if (typeof next === 'function') return next();
            return;
        }
        return res.status(200).json({ message: "Turn off command sent successfully" });
    }

    async setScheduled(req, res, next) {
        console.log(`Setting schedule for device with ID: ${req.params.id}`);
        const { startHour, startMinute, endHour, endMinute, days } = req.body;
        console.log(`Schedule: ${startHour}:${startMinute} - ${endHour}:${endMinute}, Days: ${JSON.stringify(days)}`);

        const topic = `pot/${req.params.id}/schedule`;
        mqttClient.publish(topic, JSON.stringify({ startHour, startMinute, endHour, endMinute, days }));

        next();
    }

    async changePotMode(req, res, next) {
        const { id } = req.params;
        const { mode, status } = req.body;
        const topic = `pot/${id}/command`;
        mqttClient.publish(topic, JSON.stringify({ action: "change_mode", mode, status }));
        if (res && res.headersSent) {
            if (typeof next === 'function') return next();
            return;
        }
        return res.status(200).json({ message: "Mode change command sent successfully" });
    }


    async checkIfSunny(id) {
        return new Promise((resolve, reject) => {
            const topicResponse = `pot/${id}/update/log`;
            const topicRequest = `pot/${id}/command`;

            const timeout = setTimeout(() => {
                mqttClient.removeListener("message", responseHandler);
                reject(new Error("Timeout: Arduino did not respond"));
            }, 5000);


            const responseHandler = (topic, message) => {
                if (topic === topicResponse) {
                    try {
                        const payload = JSON.parse(message.toString());


                        const isSunny = payload.light_level > 700;

                        clearTimeout(timeout);
                        mqttClient.removeListener("message", responseHandler);
                        resolve(isSunny);
                    } catch (e) {
                        console.error("Error parsing response:", e);
                    }
                }
            };

            mqttClient.on("message", responseHandler);
            mqttClient.publish(topicRequest, JSON.stringify({ action: "request_light" }));
        });
    }
}

export const mqttModel = new MqttModel()