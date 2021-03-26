const { loginToken } = require("./.secrets/config.json");
const dbManager = require("./lib/db.js");
const routeMessage = require("./lib/messagesRouter.js");
const Discord = require("discord.js");
const client = new Discord.Client();

async function main() {
	// Wait for the DB connection
	await dbManager.init();

	client.once("ready", () => {
		console.log("Ready!");
	});

	client.on("message", routeMessage);

	client.login(loginToken);
}

main();
