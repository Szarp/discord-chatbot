import { loginToken } from "./.secrets/config.json";
import dbManager from "./lib/db.js";
import routeMessage from "./lib/messagesRouter.js";
import * as Discord from "discord.js";
const client = new Discord.Client();

async function main() {
	// Wait for the DB connection
	await dbManager.init();

	client.once("ready", () => {
		// eslint-disable-next-line no-console
		console.log("Ready!");
	});

	client.on("message", routeMessage);

	client.login(loginToken);
}

main();
