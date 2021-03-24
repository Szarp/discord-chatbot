const { loginToken } = require("./.secrets/config.json");
const Discord = require("discord.js");
const client = new Discord.Client();

const { pingPong, createCommand, embed1, embed2 } = require("./lib/testMessages");

client.once("ready", () => {
	console.log("Ready!");
});

client.on("message", message => {
	const { content } = message;
	if (content === "!ping") {
		pingPong(message);
	}
	else if (content === "!create") {
		createCommand(message);
	}
	else if (content === "!embed") {
		embed1(message);
	}
	else if (content === "!embed2") {
		embed2(message);
	}
});

client.login(loginToken);
