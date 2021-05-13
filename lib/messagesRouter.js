import {  routeRoleMessage } from "./privileges.js";
import { routeTestMessage } from "./testManager.js";
import * as messageStrings from "./messageStrings.js";
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
		case "!parent":
			if (method == "set") {
				let [parentType] = args;
				if (parentType) {
					// @ts-ignore
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
 * Sends the help message
 * @param {import("discord.js").Message} param0 The received message
 */
function sendHelp({ channel }) {
	channel.send(messageStrings.helpMessageString);
}

export default routeMessage;
