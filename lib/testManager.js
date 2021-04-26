// FIXME: The structure of this file is a mess. Which methods should belong to which class and what are the relations
// between them?

import * as mongodb from "mongodb";
import dbManager from "./db.js";
import { getQuestions } from "./openTestDb.js";
import { reactions } from "./messageStrings.js";
import { Exam } from "./exam.js";
import { MessageEmbed } from "discord.js";

class Test {
	/**
	 * Creates a test (as an object, save to database somewhere else).
	 * @param {string} name A unique name identifying the test
	 * @param {import("discord.js").Snowflake} messageId The id of the message with `!create` command
	 * @param {any} channelID
	 */
	constructor(name, channelID) {
		this.name = name;
		this.channelID = channelID;
		this.activeQuestion = -1;
		// this.messageId = messageId;
		/** @type {Question[]} */
		this.questions = [];
	}
	/**
	 * Adds a question to a test identifed by `testDbId`.
	 * @param {string} text The question
	 * @param {keyof typeof QuestionType} type Question type
	 * @param {import("discord.js").Snowflake} messageId The id of the Discord message containing the question
	 * @param {mongodb.ObjectId} testDbId The value of _id property of the test in the database
	 * @param {mongodb.Collection} collection The collection in which the test is stored
	 */
	static async addQuestion(text, type, messageId, testDbId, collection) {
		const question = new Question(text, type, messageId);
		await collection.updateOne({ _id: testDbId }, { $addToSet: { questions: question } });
	}
}

/**
 * Allowed question types
 * @type {{multi: "multi", text: "text"}} This is necessary, because `as const` is not supported (microsoft/TypeScript#30445)
 */
export const QuestionType = Object.freeze({
	/** A multiple choice question (with a single or multiple correct answers) */
	multi: "multi",
	/** The student must provide their own answer */
	text: "text"
});

class Question {
	/**
	 * Creates a new question
	 * @param {string} name The question
	 * @param {keyof typeof QuestionType} type The type of the question
	 */
	constructor(name, type) {
		this.name = name;
		this.type = type;;
		// this.messageId = messageId;
		/** @type {Answer[]} */
		this.answers = [];
	}
}

/**
 * Represents an answer to a question
 */
class Answer {
	/**
	 * Create an answer to a question
	 * @param {string} content The answer text
	 * @param {boolean} correct Whether this answer is correct
	 */
	constructor(content, correct) {
		this.content = content;
		this.correct = correct;
	}
}
/**
 * @param {string} channelID
 * @param {import("discord.js").Message} message
 */
export async function readTest(channelID, message) {
	const { guild, channel, id: testMsgId } = message;
	const db = await dbManager.db();
	const testsCollection = db.collection(`${guild.id}Tests`);
	let x = await testsCollection.findOne({ channelID: channelID });
	console.log(x);
	// if (await testsCollection.findOne({ name }) !== undefined) {
}

export class TestManager {
	/**
	 * Tries to create a new test with a give name. Fails (softly) if not received on a server or if a test with
	 * such name already exists.
	 * @param {string} name The new test name
	 * @param {string} id
	 * @param {string} guild Received !create (or however it will be called) message
	 */
	static async createTest(name, id, guild) {
		try {
			const db = await dbManager.db();
			const testsCollection = db.collection(`${guild}Tests`);
			if (await testsCollection.findOne({ name: name, channelID: id }) !== undefined) {
				throw new Error("Test exist");
			}
			const test = new Test(name, id);
			await testsCollection.insertOne(test);
			return;
		} catch (e) {
			return e;
		}
	}
	/**
	 * @param {string} id
	 * @param {string} guild
	 */
	static async showQuestions(id, guild) {
		const db = await dbManager.db();
		const testsCollection = db.collection(`${guild}Tests`);
		let { questions } = await testsCollection.findOne({ channelID: id });
		let embedQuestionList = []
		for (let k = 0; k < questions.length; k++) {
			embedQuestionList.push(embedQuestion(questions[k], k))
		}
		return embedQuestionList;



		/**
		 * @param {Question[]} question
		 * @param {number} index
		 */
		function embedQuestion(question, index) {
			const embed = new MessageEmbed()
				.setTitle(`Question ${index + 1}`)
				.setColor('#DAF7A6')
				.setDescription(`${question["name"]}`);
			let answers = question["answers"];
			let answersList = answers.map((el, i) => {
				return { name: `${i + 1}, ${el.correct}.`, value: `${el.content}` }
			})
			embed.addFields(answersList)
			return embed;
		}
	}
	/**
	 * @param {number} index
	 * @param {string} guild
	 * @param {string} id
	 */
	static async setActiveQuestion(index, guild, id) {
		const db = await dbManager.db();
		const testsCollection = db.collection(`${guild}Tests`);
		await testsCollection.updateOne({ channelID: id }, { $set: { activeQuestion: index } });
	}
	/**
	 * Adds a question to the specified (or most recently created) test.
	 * @param {string} questionText The question content
	 * @param {keyof typeof QuestionType} type The type of the question
	 * @param {string} guild Id of a guild
	 * @param {string} id Channel id
	 */
	static async addQuestion(questionText, type, guild, id) {
		try {
			const db = await dbManager.db();
			const testsCollection = db.collection(`${guild}Tests`);
			const question = new Question(questionText, type);
			await testsCollection.updateOne({ channelID: id }, { $addToSet: { questions: question } });
			let doc = await testsCollection.findOne({ channelID: id });
			await testsCollection.updateOne({ channelID: id }, { $set: { activeQuestion: doc.questions.length - 1 } });
			return;
		} catch (e) {
			return e;
		}
	}

	/**
	 * Adds an answer to one of the existing questions
	 * @param {string} content The answer text
	 * @param {boolean} correct Whether the answer is correct
	 * @param {string} id
	 * @param {string} guild
	 */
	static async addAnswer(content, correct, id, guild) {
		try {
			const answer = new Answer(content, correct);
			const db = await dbManager.db();
			const testsCollection = db.collection(`${guild}Tests`);
			let { activeQuestion } = await testsCollection.findOne({ channelID: id })
			await testsCollection.updateOne({ channelID: id }, { $addToSet: { [`questions.${activeQuestion}.answers`]: answer } });
			return;
		} catch (e) {
			return e;
		}
	}
	/**
	 * Checks if a message is a response to a saved question
	 * @param {import("discord.js").Message} message The received message
	 * @returns {Promise<boolean>} Whether the message is a response to a question
	 */
	static async isResponseToQuestion(message) {
		if (!message.guild?.available || !message.reference?.messageID) {
			return false;
		}
		const db = await dbManager.db();
		const testsCollection = db.collection(`${message.guild.id}Tests`);
		const matchedTest = await testsCollection.findOne({ "questions.messageId": message.reference.messageID });
		return matchedTest !== undefined;
	}

	/**
	 * Sends questions retrieved from opentdb.com as JSON
	 * @param {import("discord.js").Message} message The received message
	 * @param {number} num The number of questions to send
	 */
	static async JSONfromOTDB(message, num) {
		const { channel } = message;
		try {
			const questions = await getQuestions(num);
			for (const [index, question] of questions.entries()) {
				let embed = Exam.embedMessage(question, index);
				const msg = await channel.send(embed);
				msg.react(reactions.one); // :one:
				msg.react(reactions.two); // :two:
				msg.react(reactions.three); // :three:
				msg.react(reactions.four);
				msg.react(reactions.white_check_mark); // :white_check_mark:
			}
		} catch (e) {
			console.error("An error occurred", e);
			if (e instanceof Error) {
				channel.send(`An error occurred: ${e.message}`);
			} else {
				channel.send("An error occured");
			}
		}
	}
}
