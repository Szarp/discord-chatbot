import * as assert from "assert";
import { isTeacher, addTeacherRole, addStudentRole, getStudents, routeRoleMessage } from "./privileges.js";
import { TestManager, readTest, routeTestMessage } from "./testManager.js";
import * as messageStrings from "./messageStrings.js";
import { createTestChannel, createExamChannel, createPrivateChannel } from "./classroom.js";
import { Exam, HandleExam } from "./exam.js";





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
		case "!t":
		case "!test":
			return await routeTestMessage({ method: method, args: args }, message);
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
			if (number != NaN || number)
				// new HandleExam().initExam(message.channel, number);
				new HandleExam().initExam2(message.channel,message.guild.id);
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
 * Sends the help message
 * @param {import("discord.js").Message} param0 The received message
 */
function sendHelp({ channel }) {
	channel.send(messageStrings.helpMessageString);
}

export default routeMessage;
