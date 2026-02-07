import { pool } from '../dbConnection.js'

export class potModel {
    constructor() { }

    async createPot(name) {
        try {
            const [results] = await pool.query();
        } catch (error) {
            console.log(error);
        }
    }
}