const { loginToken } = require("./.secrets/config.json");
const Discord = require("discord.js");
const client = new Discord.Client();

client.once("ready", () => {
	console.log("Ready!");
});

client.on("message", message => {
	if (message.content === "!ping") {
		message.channel.send("Pong.");
	}
	if (message.content === "!create") {
		let name = message.author.username;
		message.guild?.channels.create(name, {
			type: "text", //This create a text channel, you can make a voice one too, by changing "text" to "voice"
			permissionOverwrites: [
				{
					id: message.guild.roles.everyone, //To make it be seen by a certain role, use an ID instead
					allow: ["VIEW_CHANNEL", "SEND_MESSAGES", "READ_MESSAGE_HISTORY"], //Allow permissions
					deny: ["VIEW_CHANNEL", "SEND_MESSAGES", "READ_MESSAGE_HISTORY"] //Deny permissions
				}
			],
		})
			.then(console.log)
			.catch(console.error);
	}
});

client.login(loginToken);
