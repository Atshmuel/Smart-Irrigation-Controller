import { pool } from '../dbConnection.js'

class PotModel {

    async createPot(name) {
        try {
            const [results] = await pool.query();
        } catch (error) {
            console.log(error);
        }
    }
}

export const potModel = new PotModel()