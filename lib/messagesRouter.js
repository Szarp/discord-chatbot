const {TestManager, QuestionType} = require("./testManager.js");

/**
 * Routes incoming messages to appropriate handlers
 * @param {import("discord.js").Message} message The received message
 */
async function routeMessage(message) {
	// TODO: Add priviledge verification
	const { content } = message;
	if (content === "!help") {
		return sendHelp(message);
	}
	const createTestRegex = /^!create\s(?<testName>[\S\s]+)/i;
	/** @type {RegExpExecArray | null} */
	let match;
	if ((match = createTestRegex.exec(content)) !== null && match.groups?.testName) {

		TestManager.createTest(match.groups.testName, message);
		return;
	}
	const questionRegex = /^!question (:?(?<multi>multi)|text)\s(?<questionText>[\S\s]+)/i;
	if ((match = questionRegex.exec(content)) !== null && match.groups?.questionText) {
		const type = match.groups.multi === undefined ? QuestionType.text : QuestionType.multi;
		TestManager.addQuestion(match.groups.questionText, type, message);
		return;
	}
	if (await TestManager.isResponseToQuestion(message)) {
		let correct = false;
		let offset = 6;
		if (content.toLowerCase().startsWith("correct ")) {
			correct = true;
			offset = 8;
		} else if (!content.toLowerCase().startsWith("wrong ")) {
			return;
		}
		TestManager.addAnswer(content.substring(offset).trim(), correct, message);
		return;
	}
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
\`correct|wrong answer\` add an answer. Use \`correct\` or \`wrong\` whether the answer should be considered correct. **Must be in response to a \`!question\` message.**`);
}

module.exports = routeMessage;
