import * as assert from "assert";
import { isTeacher, addTeacherRole, addStudentRole } from "./privileges.js";
import { TestManager, QuestionType, readTest } from "./testManager.js";
import * as messageStrings from "./messageStrings.js";
import { createTestChannel, createExamChannel } from "./classroom.js";
import { HandleExam } from "./exam.js";

/**
 * Parser for test commands
 * @param {*} param0 
 * @param {import("discord.js").Message} message 
 */
async function routeTestMessage({ method, args }, message) {
	switch (method) {
		case "question":
			let [questionType, ...questionText] = args;
			if (questionType && questionText) {
				return addQuestionWrapper({ multi: questionType, questionText: questionText.join(" ") }, message.guild, message.channel);
			}
			else {
				console.log("sth went wrong")
			}
			break;
		case "create":
			let [testName] = args;
			try {
				if (testName) {
					const channel = await createTestChannel(message.guild, testName);
					const parentID = "824034558009671700";
					await channel.setParent(parentID, { lockPermissions: true })
					return createTestWrapper(testName, channel.id, message.guild.id);
				}
			} catch (e) {
				message.channel.send(e);
			}
			break;
		case "read":
			await readTest(message.channel.id, message);
			break;
		case "show":
			let [elemToShow] = args;
			if (elemToShow == "questions") {
				let embedMessage = await TestManager.showQuestions(message.channel.id, message.guild.id);
				console.log(embedMessage);
				let sendedEmbeds = []
				for (let k in embedMessage) {
					let msg = await message.channel.send(embedMessage[k]);
					sendedEmbeds.push(msg);
				} for (let i in sendedEmbeds) {
					sendedEmbeds[i].react(messageStrings.reactions.gear)
					sendedEmbeds[i].react(messageStrings.reactions.wastebasket)
				}

			}
			break;
		case "answer":
			let [type, ...answerText] = args;
			if (type == "correct" || type == 'wrong')
				TestManager.addAnswer(answerText.join(" "), type, message.channel.id, message.guild.id);
			// if(type == 'wrong')
			// 	TestManager.addWrongAnswer(questionText.join(" "), type, message.channel.id);
			break;
		default:
			console.log(`Role switch case: ${method},${args}`)
			break;
	}
	// if (await TestManager.isResponseToQuestion(message)) {
	// 	return addAnswerWrapper(authorIsTeacher, message);
	// }

	/**
	 * @param {string} testName
	 * @param {any} channelID
	 * @param {string} guild
	 */
	function createTestWrapper(testName, channelID, guild) {
		try {
			TestManager.createTest(testName, channelID, guild);
			return;
		} catch (e) {
			return e;

		}
	}
	/**
	 * @param {*} match
	 * @param {import("discord.js").Message} message
	 */
	function addQuestionWrapper({ multi, questionText }, { id: guild }, { id }) {
		assert.ok(multi && questionText);
		const type = multi === undefined ? QuestionType.text : QuestionType.multi;
		TestManager.addQuestion(questionText, type, guild, id);
	}
}
/**
 * Parser for role commands
 * @param {*} param0 
 * @param {import("discord.js").Message} message 
 */
async function routeRoleMessage({ method, args }, message) {
	switch (method) {
		case "set":
			let [person] = args;
			if (person) {
				if (person == "teacher")
					return addTeacherRoleWrapper(message);
				if (person == "student")
					return addStudentRoleWrapper(message);
			}
			break;
		default:
			console.log(`Role switch case: ${method},${args}`)
			break;
	}
	/**
	 * @param {import("discord.js").Message} message
	 */
	function addTeacherRoleWrapper(message) {
		if (!message.member?.hasPermission("ADMINISTRATOR")) {
			return noAdminPerm(message.channel);
		}
		if (message.mentions.roles.size !== 1) {
			return noRoleMentionOrMany(message.channel);
		}
		const role = message.mentions.roles.first();
		assert.ok(message.guild && role !== undefined);
		addTeacherRole(message.guild.id, role.id).then(() => message.react("👌"));
	}
	/**
	 * @param {import("discord.js").Message} message
	 */
	function addStudentRoleWrapper(message) {
		if (!message.member?.hasPermission("ADMINISTRATOR")) {
			return noAdminPerm(message.channel);
		}
		if (message.mentions.roles.size !== 1) {
			return noRoleMentionOrMany(message.channel);
		}
		const role = message.mentions.roles.first();
		assert.ok(message.guild && role !== undefined);
		addStudentRole(message.guild.id, role.id).then(() => message.react("👌"));
	}
}
/**
 * Parser for channel commands
 * @param {*} param0 
 * @param {import("discord.js").Message} message 
 */
async function routeChannelMessage({ method, args }, message) {
	switch (method) {
		case "create":
			let [type, channelName] = args;
			if (type && channelName) {
				if (type == "test") {
					return createTestChannel(message.guild, channelName);
				} else if (type == "private") {
					return createExamChannel(message.guild, channelName, message.author.id);
				}
				else { }
			} else {
				console.log("sth went wrong");
			}
			break;
		default:
			console.log(`Channel switch case: ${method},${args}`)
			break;
	}
}
/**
 * Routes incoming messages to appropriate handlers
 * @param {import("discord.js").Message} message The received message
 */
async function routeMessage(message) {
	const { content } = message;
	const [head, method, ...args] = content.split(" ").filter(el => el != "");
	switch (head) {
		case "!help":
			return sendHelp(message);
		case "!test":
			await routeTestMessage({ method: method, args: args }, message);
			break;
		case "!role":
			await routeRoleMessage({ method: method, args: args }, message)
			break;
		case "!channel":
			await routeChannelMessage({ method: method, args: args }, message);
			break;
		case "!trivia":
			// let [number]=args;
			if (method) {
				return triviaWrapper(message, method);
			}
		case "!exam":
			const number = parseInt(method);
			if (number != NaN)
				new HandleExam().initExam(message.channel, number);
			break;
		case "!parent":
			if (method == "set") {
				let [parentType] = args;
				if (parentType) {
					if (setFolderWrapper(message.channel, parentType)) {
						message.react("👌");
					}
				}
			}
		default:
			break;
	}
}

/**
 * @param {import("discord.js").TextChannel} channel
 * @param {string} folderName
 */
function setFolderWrapper({ parentID }, folderName) {
	//TODO implement folder setting in channel creation
	if (folderName == "") {
		return false;
	}
	try {
		console.log(`Set channel ${parentID} as ${folderName}`)
		return true;
	} catch (e) {
		return false;
	}
}
/**
 * @param {import("discord.js").Message} message
 * @param {string} numberStr
 */
function triviaWrapper(message, numberStr) {
	// TODO: add privilege checks in the final version
	const number = parseInt(numberStr);
	TestManager.JSONfromOTDB(message, number);
}

/**
 * @param {import("discord.js").TextChannel | import("discord.js").DMChannel | import("discord.js").NewsChannel} channel
 */
function noAdminPerm(channel) {
	channel.send(messageStrings.noAdminPermisionsString);
}

/**
 * @param {import("discord.js").TextChannel | import("discord.js").DMChannel | import("discord.js").NewsChannel} channel
 */
function noRoleMentionOrMany(channel) {
	channel.send(messageStrings.noOrManyRoleMentionString);
}

/**
 * Sends the help message
 * @param {import("discord.js").Message} param0 The received message
 */
function sendHelp({ channel }) {
	channel.send(messageStrings.helpMessageString);
}

export default routeMessage;
