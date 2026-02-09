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

    async getPot(req, res, next) {
        const { id } = req.params
        try {
            const [results] = await pool.query(
                'SELECT * FROM pots WHERE id = ?',
                [id]
            );

            if (results.length === 0) {
                return res.status(404).json({ message: "Pot not found" });
            }

            const pot = results[0];

            res.status(200).json(pot);
        } catch (error) {
            console.log(error);
            res.status(400).json({ message: "Error fetching pot" });
        }
    }

    async updatePot(id, query, queryParams) {
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
        console.log("id here:", id);

        const alreadyAskedUser = req.cookies.alreadyAskedUser

        try {
            // Check if it's a recommended time to use
            if (!alreadyAskedUser) {
                const isRecommanded = await this.isRecommandedTimeToUse(id);
                if (!isRecommanded) {
                    res.cookie('alreadyAskedUser', true, {
                        maxAge: 1000 * 60 * 60,
                        httpOnly: false,
                        sameSite: 'none'
                    })
                    return res.status(201).json({ message: "Not recommended to turn on right now, Are you sure you want to turn on?" })
                }
            }

            await this.updatePot(id, 'UPDATE pots SET status = ? WHERE id = ?', [true, id]);
            await this.createPotLog(id, 'INSERT INTO pot_logs (pot_id, turn_on_at) VALUES (?, ?)', [id, Date.now()]);
            res.status(200).json({ message: "Pot turned on successfully", id, status: true });
            next();
        } catch (error) {
            console.log(error);
            res.status(400).json({ message: "Error turning on pot" });
        }
    }

    async turnOff(req, res, next) {
        const { id } = req.params
        console.log("id here:", id);

        try {
            await this.updatePot(id, 'UPDATE pots SET status = ? WHERE id = ?', [false, id]);
            await this.createPotLog(id, 'INSERT INTO pot_logs (pot_id, turn_off_at) VALUES (?, ?)', [id, Date.now()]);
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

            res.status(200).json({ message: "Schedule saved successfully", id });
            next();
        } catch (error) {
            console.log(error);
            res.status(400).json({ message: "Error saving schedule" });
        }
    }

    async isRecommandedTimeToUse(id) {
        try {
            const [schedules] = await pool.query(
                'SELECT * FROM pot_schedules WHERE pot_id = ?',
                [id]
            );

            if (schedules.length === 0) return true;

            const schedule = schedules[0];
            const now = new Date();
            const currentHour = now.getHours();
            const currentMinute = now.getMinutes();
            const currentDay = now.getDay();

            const days = JSON.parse(schedule.days);
            const isValidDay = days.includes(currentDay);

            if (!isValidDay) return false;

            const currentTime = currentHour * 60 + currentMinute;
            const startTime = schedule.start_hour * 60 + schedule.start_minute;
            const endTime = schedule.end_hour * 60 + schedule.end_minute;

            return currentTime >= startTime && currentTime <= endTime;
        } catch (error) {
            console.log(error);
            return true;
        }
    }
}


export const potModel = new PotModel()