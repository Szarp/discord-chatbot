import * as assert from "assert";
import { MongoClient } from "mongodb";
import { dbURL as url, dbName } from "../.secrets/config.json";

/**
 * A class providing a shared connection to a database
 */
class DBManager {
	constructor() {
		this.client = new MongoClient(url);
		this._db = null;
	}
	/**
	 * Initialises the database connection.
	 */
	async init() {
		await this.client.connect();
		this._db = this.client.db(dbName);
	}
	/**
	 * Returns the `Db` object. Connects to the database if the client got disconnected.
	 * @returns The DB specified in the config
	 */
	async db() {
		if (!this.client.topology?.isConnected()) {
			await this.init();
		}
		assert.ok(this._db !== null, "The _db can't be null after calling init().");
		return this._db;
	}
}

/**
 * Connection to the database specified in config. Use the `.db()` method to get a `Db` object.
 */
const dbManager = new DBManager();

export default dbManager;
