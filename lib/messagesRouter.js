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
	const authorIsTeacher = message.member ? await isTeacher(message.member) : false;
	switch (method) {
		case "question":
			let [questionType, ...questionText] = args;
			if (questionType && questionText) {
				return addQuestionWrapper(authorIsTeacher, { multi: questionType, questionText: questionText.join(" ") }, message);
			}
			else {
				console.log("sth went wrong")
			}
			break;
		case "create":
			let [testName] = args;
			if (testName) {
				return createTestWrapper(authorIsTeacher, testName, message);
			}
			else {
				console.log("sth went wrong");
			}
			break;
		case "read":
			let [name] = args;
			if (name)
				await readTest(name, message);
			break;
		default:
			console.log(`Role switch case: ${method},${args}`)
			break;
	}
	// if (await TestManager.isResponseToQuestion(message)) {
	// 	return addAnswerWrapper(authorIsTeacher, message);
	// }
	/**
	 * @param {boolean} authorIsTeacher
	 * @param {string} testName
	 * @param {import("discord.js").Message} message
	 */
	function createTestWrapper(authorIsTeacher, testName, message) {
		assert.ok(testName);
		if (authorIsTeacher) {
			TestManager.createTest(testName, message);
		} else {
			message.reply(messageStrings.roleTeacherRequiredString);
		}
	}
	/**
	 * @param {boolean} authorIsTeacher
	 * @param {*} match
	 * @param {import("discord.js").Message} message
	 */
	function addQuestionWrapper(authorIsTeacher, { multi, questionText }, message) {
		assert.ok(multi && questionText);
		if (authorIsTeacher) {
			const type = multi === undefined ? QuestionType.text : QuestionType.multi;
			TestManager.addQuestion(questionText, type, message);
		} else {
			message.reply(messageStrings.roleTeacherRequiredString);
		}
	}
	/**
	 * @param {boolean} authorIsTeacher
	 * @param {import("discord.js").Message} message
	 */
	function addAnswerWrapper(authorIsTeacher, message) {
		if (authorIsTeacher) {
			const { content } = message;
			let correct = false;
			let offset = 6;
			if (content.toLowerCase().startsWith("correct ")) {
				correct = true;
				offset = 8;
			} else if (!content.toLowerCase().startsWith("wrong ")) {
				return;
			}
			TestManager.addAnswer(content.substring(offset).trim(), correct, message);
		} else {
			message.reply(messageStrings.roleTeacherRequiredString);
		}
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
			new HandleExam().initExam(message.channel);
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
// /**
//  * @param {import("discord.js").Message} message
//  */
// function addTeacherRoleWrapper(message) {
// 	if (!message.member?.hasPermission("ADMINISTRATOR")) {
// 		return noAdminPerm(message.channel);
// 	}
// 	if (message.mentions.roles.size !== 1) {
// 		return noRoleMentionOrMany(message.channel);
// 	}
// 	const role = message.mentions.roles.first();
// 	assert.ok(message.guild && role !== undefined);
// 	addTeacherRole(message.guild.id, role.id).then(() => message.react("👌"));
// }

// /**
//  * @param {import("discord.js").Message} message
//  */
// function addStudentRoleWrapper(message) {
// 	if (!message.member?.hasPermission("ADMINISTRATOR")) {
// 		return noAdminPerm(message.channel);
// 	}
// 	if (message.mentions.roles.size !== 1) {
// 		return noRoleMentionOrMany(message.channel);
// 	}
// 	const role = message.mentions.roles.first();
// 	assert.ok(message.guild && role !== undefined);
// 	addStudentRole(message.guild.id, role.id).then(() => message.react("👌"));
// }

// /**
//  * @param {boolean} authorIsTeacher
//  * @param {RegExpExecArray} match
//  * @param {import("discord.js").Message} message
//  */
// function addQuestionWrapper(authorIsTeacher, { multi, questionText }, message) {
// 	assert.ok(multi && questionText);
// 	if (authorIsTeacher) {
// 		const type = multi === undefined ? QuestionType.text : QuestionType.multi;
// 		TestManager.addQuestion(questionText, type, message);
// 	} else {
// 		message.reply(messageStrings.roleTeacherRequiredString);
// 	}
// }

// /**
//  * @param {boolean} authorIsTeacher
//  * @param {import("discord.js").Message} message
//  */
// function addAnswerWrapper(authorIsTeacher, message) {
// 	if (authorIsTeacher) {
// 		const { content } = message;
// 		let correct = false;
// 		let offset = 6;
// 		if (content.toLowerCase().startsWith("correct ")) {
// 			correct = true;
// 			offset = 8;
// 		} else if (!content.toLowerCase().startsWith("wrong ")) {
// 			return;
// 		}
// 		TestManager.addAnswer(content.substring(offset).trim(), correct, message);
// 	} else {
// 		message.reply(messageStrings.roleTeacherRequiredString);
// 	}
// }

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
