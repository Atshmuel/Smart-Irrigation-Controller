import { pool } from '../dbConnection.js'

class PotModel {

    async createPot(req, res, next) {
        try {
            const [results] = await pool.query();
        } catch (error) {
            console.log(error);
        }
    }

    async getPot(req, res, next) {
        const { id } = req.params
        try {
            const [results] = await pool.query();
        } catch (error) {
            console.log(error);
        }
    }

    async updatePot(id, payload) {
        try {
            const [results] = await pool.query();
        } catch (error) {
            console.log(error);
            res.status(400).json(error)
        }
    }

    async deletePot(req, res, next) {
        const { id } = req.params

        try {
            const [results] = await pool.query();
        } catch (error) {
            console.log(error);
            res.status(400).json(error)
        }
    }

    async createPotLog(id, payload) {
        try {
            const [results] = await pool.query();
        } catch (error) {
            console.log(error);
            res.status(400).json(error)
        }
    }

    async turnOn(req, res, next) {
        const { id } = req.params
        const alreadyAskedUser = req.cookies.alreadyAskedUser
        if (!alreadyAskedUser) {
            const isRecommanded = await isRecommandedTimeToUse()
            if (!isRecommanded) {
                res.cookie('alreadyAskedUser', true, {
                    maxAge: 1000 * 60 * 60,
                    httpOnly: false,
                    sameSite: 'none'
                })
                res.status(201).json({ message: "Not recommanded to turn on right now, Are you sure you want to turn on?" })
            }
        }
        try {
            await this.updatePot(id, "payload")
            await this.createPotLog(id, { turnOnAt: Date.now() })
            next()
        } catch (error) {
            res.status(400).json(error)

        }
    }

    async turnOff(req, res, next) {
        const { id } = req.params
        try {
            await this.updatePot(id, "payload")
            await this.createPotLog(id, { turnOffAt: Date.now() })
            next()
        } catch (error) {
            console.log(error);
            res.status(400).json(error)
        }
    }


    async setScheduled(req, res, next) {
        const { startHour, endHour, days } = req.schedule
        if (!startHour || !endHour || !days) {
            res.status(400).json({ message: "missing startHour or endHour or days" })
        }
        try {
            await this.updatePot(id, "payload")

            next()

        } catch (error) {
            console.log(error);
            res.status(400).json(error)
        }
    }
}

export const potModel = new PotModel()