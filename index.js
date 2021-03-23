const { loginToken } = require("./.secrets/config.json");
const Discord = require("discord.js");
const client = new Discord.Client();

client.once("ready", () => {
	console.log("Ready!");
});

client.on("message", message => {
	const { channel, content } = message;
	if (content === "!ping") {
		channel.send("Pong.");
	}
	if (content === "!create") {
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
			.catch(console.error);
	}
	if (content === "!embed") {
		const exampleEmbed = new Discord.MessageEmbed()
			.setColor("#0099ff")
			.setTitle("Some title")
			.setURL("https://discord.js.org/")
			.setAuthor("Some name", "https://i.imgur.com/wSTFkRM.png", "https://discord.js.org")
			.setDescription("Some description here")
			.setThumbnail("https://i.imgur.com/wSTFkRM.png")
			.addFields(
				{ name: "Regular field title", value: "Some value here" },
				{ name: "\u200B", value: "\u200B" },
				{ name: "Inline field title", value: "Some value here", inline: true },
				{ name: "Inline field title", value: "Some value here", inline: true },
			)
			.addField("Inline field title", "Some value here", true)
			.setImage("https://i.imgur.com/wSTFkRM.png")
			.setTimestamp()
			.setFooter("Some footer text here", "https://i.imgur.com/wSTFkRM.png");

		channel.send(exampleEmbed);
	}
	if (content === "!embed2") {
		const exampleEmbed = {
			color: 0x0099ff,
			title: "Some title",
			url: "https://discord.js.org",
			author: {
				name: "Some name",
				icon_url: "https://i.imgur.com/wSTFkRM.png",
				url: "https://discord.js.org",
			},
			description: "Some description here",
			thumbnail: {
				url: "https://i.imgur.com/wSTFkRM.png",
			},
			fields: [
				{
					name: "Regular field title",
					value: "Some value here",
				},
				{
					name: "\u200b",
					value: "\u200b",
					inline: false,
				},
				{
					name: "Inline field title",
					value: "Some value here",
					inline: true,
				},
				{
					name: "Inline field title",
					value: "Some value here",
					inline: true,
				},
				{
					name: "Inline field title",
					value: "Some value here",
					inline: true,
				},
			],
			image: {
				url: "https://i.imgur.com/wSTFkRM.png",
			},
			timestamp: new Date(),
			footer: {
				text: "Some footer text here",
				icon_url: "https://i.imgur.com/wSTFkRM.png",
			},
		};

		channel.send({ embed: exampleEmbed });
	}
});

client.login(loginToken);
