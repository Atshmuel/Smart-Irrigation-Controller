import { isRecommandedTimeToUse } from '../../utils/helpers.js';
import { pool } from '../dbConnection.js'

class PotModel {

    async createPot(req, res, next) {
        try {
            const { type_id, name } = req.body;
            const [results] = await pool.query(
                'INSERT INTO pots (type_id, name, date, status) VALUES (?, ?, NOW(), ?)',
                [type_id, name, false]
            );
            res.status(201).json({ id: results.insertId, message: "Pot created successfully" });
        } catch (error) {
            console.log(error);
            res.status(400).json({ message: "Error creating pot" });
        }
    }

    async createSpecies(req, res, next) {
        try {
            const { type, instructions } = req.body;
            const [results] = await pool.query(
                'INSERT INTO species (type, instructions) VALUES (?, ?)',
                [type, instructions]
            );
            res.status(201).json({ id: results.insertId, message: "Species created successfully" });
        } catch (error) {
            console.log(error);
            res.status(400).json({ message: "Error creating species" });
        }
    }

    async getSpecies(req, res, next) {
        try {
            const [results] = await pool.query(
                'SELECT id,type FROM species'
            );
            res.status(200).json(results);
        } catch (error) {
            console.log(error);
            res.status(400).json({ message: "Error fetching species" });
        }
    }

    async getPot(req, res, next) {
        const { id } = req.params
        const { withSchedule } = req.query
        try {
            const [results] = await pool.query(
                'SELECT * FROM pots WHERE id = ?',
                [id]
            );

            if (results.length === 0) {
                return res.status(404).json({ message: "Pot not found" });
            }

            const pot = results[0];
            if (withSchedule === true || withSchedule === "true") {
                const [scheduleResults] = await pool.query(
                    'SELECT * FROM pot_schedules WHERE pot_id = ?',
                    [id]
                );
                if (scheduleResults.length > 0) {
                    const schedule = scheduleResults[0];
                    schedule.days = JSON.parse(schedule.days);
                    pot.schedule = schedule;
                }
            }
            res.status(200).json(pot);
        } catch (error) {
            console.log(error);
            res.status(400).json({ message: "Error fetching pot" });
        }
    }

    async getAllPots(req, res, next) {
        try {
            const [results] = await pool.query(
                `SELECT * from pots`
            );
            res.status(200).json(results);
        } catch (error) {
            console.log(error);
            res.status(400).json({ message: "Error fetching pots" });
        }
    }

    async updatePot(query, queryParams) {
        try {
            const [results] = await pool.query(
                query,
                queryParams
            );
            return results;
        } catch (error) {
            console.log(error);
            throw error;
        }
    }

    async deletePot(req, res, next) {
        const { id } = req.params

        try {
            // Delete associated schedules first
            await pool.query('DELETE FROM pot_schedules WHERE pot_id = ?', [id]);

            // Delete the pot
            const [results] = await pool.query(
                'DELETE FROM pots WHERE id = ?',
                [id]
            );

            if (results.affectedRows === 0) {
                return res.status(404).json({ message: "Pot not found" });
            }

            res.status(200).json({ message: "Pot deleted successfully" });
        } catch (error) {
            console.log(error);
            res.status(400).json({ message: "Error deleting pot" });
        }
    }

    async createPotLog(id, query, queryParams) {
        try {
            const [results] = await pool.query(query, queryParams);
            return results;
        } catch (error) {
            throw error;
        }
    }

    async turnOn(req, res, next) {
        const { id } = req.params

        const alreadyAskedUser = req.cookies.alreadyAskedUser

        try {
            // Check if it's a recommended time to use
            if (!alreadyAskedUser) {
                const isRecommandedToUse = await isRecommandedTimeToUse(id);
                if (!isRecommandedToUse) {
                    res.cookie('alreadyAskedUser', true, {
                        maxAge: 1000 * 60 * 5, // 5 minutes
                        httpOnly: false,
                        sameSite: 'lax',
                    })
                    return res.status(201).json({ message: "לא מומלץ להדליק בין השעות 12:00 - 18:00 או כשאשר יש שמש חזקה, האם עדיין תרצו להדליק?", requestConfirmation: true })
                }
            }

            await this.updatePot('UPDATE pots SET status = ? WHERE id = ?', [true, id]);
            await this.createPotLog(id, 'INSERT INTO watering_events (pot_id, start_time) VALUES (?, NOW())', [id]);
            res.status(200).json({ message: "Pot turned on successfully", id, status: true });
            next();
        } catch (error) {
            console.log(error);
            res.status(400).json({ message: "Error turning on pot" });
        }
    }

    async turnOff(req, res, next) {
        const { id } = req.params

        try {
            await this.updatePot('UPDATE pots SET status = ? WHERE id = ?', [false, id]);

            const [row] = await pool.query(
                `SELECT id, start_time 
                FROM watering_events 
                WHERE pot_id = ? AND end_time IS NULL 
                ORDER BY start_time DESC 
                LIMIT 1`,
                [id]
            );

            if (row.length === 0) {
                return res.status(400).json({ message: "No active watering event found for this pot" });
            }

            const event = row[0]
            if (!event.start_time) {
                return res.status(400).json({ message: "Pot is already off" });
            }

            await this.createPotLog(id,
                `UPDATE watering_events
                    SET end_time = NOW(),
                    duration_seconds = TIMESTAMPDIFF(SECOND, start_time, NOW())
                    WHERE id = ?`, [event.id]);

            res.status(200).json({ message: "Pot turned off successfully", id, status: false });
            next();
        } catch (error) {
            console.log(error);
            res.status(400).json({ message: "Error turning off pot" });
        }
    }

    async setScheduled(req, res, next) {
        const { id } = req.params;
        const { startHour, startMinute, endHour, endMinute, days } = req.body;

        if (startHour === undefined || endHour === undefined || !days) {
            return res.status(400).json({ message: "Missing startHour, endHour, or days" });
        }

        try {
            // Convert days array to JSON string
            const daysJson = JSON.stringify(days);

            // Check if schedule exists
            const [existing] = await pool.query(
                'SELECT id FROM pot_schedules WHERE pot_id = ?',
                [id]
            );


            if (existing.length > 0) {
                // Update existing schedule
                await pool.query(
                    'UPDATE pot_schedules SET start_hour = ?, start_minute = ?, end_hour = ?, end_minute = ?, days = ? WHERE pot_id = ?',
                    [startHour, startMinute, endHour, endMinute, daysJson, id]
                );
            } else {
                // Create new schedule
                await pool.query(
                    'INSERT INTO pot_schedules (pot_id, start_hour, start_minute, end_hour, end_minute, days) VALUES (?, ?, ?, ?, ?, ?)',
                    [id, startHour, startMinute, endHour, endMinute, daysJson]
                );
            }

            // Update pot mode to 'scheduled'
            req.body.mode = 'scheduled'; // Set mode in request body for the next middleware

            res.status(200).json({ message: "Schedule saved successfully", id });
            next();
        } catch (error) {
            console.log(error);
            res.status(400).json({ message: "Error saving schedule" });
        }
    }
    async getSchedule(req, res, next) {
        const { id } = req.params
        try {
            const [results] = await pool.query(
                'SELECT * FROM pot_schedules WHERE pot_id = ?',
                [id]
            );

            if (results.length === 0) {
                return res.status(404).json({ message: "Schedule not found" });
            }

            const schedule = results[0];
            schedule.days = JSON.parse(schedule.days);

            res.status(200).json(schedule);
        } catch (error) {
            console.log(error);
            res.status(400).json({ message: "Error fetching schedule" });
        }
    }


    async changePotMode(req, res, next) {
        const { id } = req.params;
        const { mode } = req.body;

        try {
            const [results] = await pool.query(
                'UPDATE pots SET mode = ? WHERE id = ?',
                [mode, id]
            );
            if (results.affectedRows === 0) {
                return res.status(404).json({ message: "Pot not found" });
            }
            next();
        } catch (error) {
            console.log(error);
            res.status(400).json({ message: "Error changing pot mode" });
        }
    }



}


export const potModel = new PotModel()