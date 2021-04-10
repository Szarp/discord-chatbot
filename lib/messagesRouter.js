import * as assert from "assert";
import { isTeacher, addTeacherRole, addStudentRole } from "./privileges.js";
import { TestManager, QuestionType } from "./testManager.js";

/**
 * Routes incoming messages to appropriate handlers
 * @param {import("discord.js").Message} message The received message
 */
async function routeMessage(message) {
	const { content } = message;
	if (content === "!help") {
		return sendHelp(message);
	}
	const authorIsTeacher = message.member ? await isTeacher(message.member) : false;
	const createTestRegex = /^!create\s(?<testName>[\S\s]+)/i;
	/** @type {RegExpExecArray | null} */
	let match;
	if ((match = createTestRegex.exec(content)) !== null && match.groups?.testName) {
		return createTestWrapper(authorIsTeacher, match, message);
	}
	const questionRegex = /^!question (:?(?<multi>multi)|text)\s(?<questionText>[\S\s]+)/i;
	if ((match = questionRegex.exec(content)) !== null && match.groups?.questionText) {
		return addQuestionWrapper(authorIsTeacher, match, message);
	}
	if (await TestManager.isResponseToQuestion(message)) {
		return addAnswerWrapper(authorIsTeacher, message);
	}
	if (content.toLowerCase().startsWith("!teacherrole ")) {
		return addTeacherRoleWrapper(message);
	}
	if (content.toLowerCase().startsWith("!studentrole ")) {
		return addStudentRoleWrapper(message);
	}
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

/**
 * @param {boolean} authorIsTeacher
 * @param {RegExpExecArray} match
 * @param {import("discord.js").Message} message
 */
function addQuestionWrapper(authorIsTeacher, match, message) {
	assert.ok(match.groups?.multi && match.groups.questionText);
	if (authorIsTeacher) {
		const type = match.groups.multi === undefined ? QuestionType.text : QuestionType.multi;
		TestManager.addQuestion(match.groups.questionText, type, message);
	} else {
		message.reply("Teacher role is required to use this command.");
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
		message.reply("Teacher role is required to use this command.");
	}
}

/**
 * @param {boolean} authorIsTeacher
 * @param {RegExpExecArray} match
 * @param {import("discord.js").Message} message
 */
function createTestWrapper(authorIsTeacher, match, message) {
	assert.ok(match.groups?.testName);
	if (authorIsTeacher) {
		TestManager.createTest(match.groups.testName, message);
	} else {
		message.reply("Teacher role is required to use this command.");
	}
}

/**
 * @param {import("discord.js").TextChannel | import("discord.js").DMChannel | import("discord.js").NewsChannel} channel
 */
function noAdminPerm(channel) {
	channel.send("Only server administrators can use this command");
}

/**
 * @param {import("discord.js").TextChannel | import("discord.js").DMChannel | import("discord.js").NewsChannel} channel
 */
function noRoleMentionOrMany(channel) {
	channel.send("Exactly one role must be mentioned in this command");
}

/**
 * Sends the help message
 * @param {import("discord.js").Message} param0 The received message
 */
function sendHelp({ channel }) {
	channel.send(`Available commands:
\`!help\` show this help message
\`!create testname\` create a test called *testname*
\`!question multi|text questiontext\` add a question to the most recently created test. Use \`multi\` to denote a multiple choice question or \`text\` if there are no predefined answers
\`correct|wrong answer\` add an answer. Use \`correct\` or \`wrong\` whether the answer should be considered correct. **Must be in response to a \`!question\` message.**
\`!teacherrole @teacherRole\` add the role \`teacherRole\` as a recognised teacher role. Can be sent only by administrators.
\`!studentrole @studentRole\` add the role \`studentRole\` as a recognised student role. Can be sent only by administrators.`);
}

export default routeMessage;
