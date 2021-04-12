// FIXME: The structure of this file is a mess. Which methods should belong to which class and what are the relations
// between them?

import * as mongodb from "mongodb";
import dbManager from "./db.js";
import { getQuestions } from "./openTestDb.js";
import { reactions } from "./messageStrings.js";

import { MessageEmbed } from "discord.js";
class Test {
	/**
	 * Creates a test (as an object, save to database somewhere else).
	 * @param {string} name A unique name identifying the test
	 * @param {import("discord.js").Snowflake} messageId The id of the message with `!create` command
	 */
	constructor(name, messageId) {
		this.name = name;
		this.messageId = messageId;
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
	 * @param {import("discord.js").Snowflake} messageId The id of the Discord message containing the question
	 */
	constructor(name, type, messageId) {
		this.name = name;
		this.type = type;
		this.messageId = messageId;
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
	 * @param {import("discord.js").Snowflake} messageId The message ID
	 * @param {boolean} correct Whether this answer is correct
	 */
	constructor(content, messageId, correct) {
		this.content = content;
		this.messageId = messageId;
		this.correct = correct;
	}
}

export class TestManager {
	/**
	 * Tries to create a new test with a give name. Fails (softly) if not received on a server or if a test with
	 * such name already exists.
	 * @param {string} name The new test name
	 * @param {import("discord.js").Message} message Received !create (or however it will be called) message
	 */
	static async createTest(name, message) {
		const { guild, channel, id: testMsgId } = message;
		if (!guild?.available) {
			channel.send("Can't create a new test. Server (guild) is not available.");
			return;
		}
		if (name === "") {
			channel.send("Can't create a new test. The test name must not be empty.");
			return;
		}
		const db = await dbManager.db();
		const testsCollection = db.collection(`${guild.id}Tests`);
		if (await testsCollection.findOne({ name }) !== undefined) {
			channel.send("Can't create a new test. A test with this name already exists.");
			return;
		}
		const test = new Test(name, testMsgId);
		// At this point a document with such name may already exist, but I'll just ignore it. A transaction could be
		// used to avoid such problems at a cost of worse performance (as if it would matter here).
		await testsCollection.insertOne(test);
		const configsCollection = db.collection("configs");
		// TODO: Remove upsert when the proper initialisation is ready (setupDb.js)
		await configsCollection.updateOne({ _id: guild.id }, { $set: { lastTestMsgId: testMsgId } }, { upsert: true });
		message.react("👌");
	}
	/**
	 * Adds a question to the specified (or most recently created) test.
	 * @param {string} name The question content
	 * @param {keyof typeof QuestionType} type The type of the question
	 * @param {import("discord.js").Message} message The received message
	 * @param {import("discord.js").Snowflake} [testMsgId] The ID of the test message
	 */
	static async addQuestion(name, type, message, testMsgId) {
		const { guild, channel, id } = message;
		if (!guild?.available) {
			channel.send("Can't add a new question. Server (guild) is not available.");
			return;
		}
		const db = await dbManager.db();
		const testsCollection = db.collection(`${guild.id}Tests`);
		// findOne may be faster, because it should stop search at the first match
		const testsNumber = await testsCollection.countDocuments({ $and: [{ name: { $ne: "" } }, { name: { $exists: true } }] });
		if (testsNumber === 0) {
			channel.send("Can't add a new question. There are no tests. Use `!create <testname>` to create one.\nSend `!help` to get a help message.");
			return;
		}
		if (typeof testMsgId === "undefined") {
			const configsCollection = db.collection("configs");
			const testObj = await configsCollection.findOne({ _id: guild.id }, { projection: { lastTestMsgId: 1 } });
			testMsgId = testObj?.lastTestMsgId;
		}
		const testObj = await testsCollection.findOne({ messageId: testMsgId });
		if (typeof testObj !== "object" || !(testObj._id instanceof mongodb.ObjectId)) {
			channel.send("Can't add a new question. The specified test does not exist.");
			return;
		}
		await Test.addQuestion(name, type, id, testObj._id, testsCollection);
		message.react("👌");
	}
	/**
	 * Adds an answer to one of the existing questions
	 * @param {string} content The answer text
	 * @param {boolean} correct Whether the answer is correct
	 * @param {import("discord.js").Message} message The message creating the answer
	 */
	static async addAnswer(content, correct, message) {
		if (!message.guild?.available || !message.reference?.messageID) {
			message.channel.send("Something went wrong while adding answer");
			return;
		}
		const answer = new Answer(content, message.id, correct);
		const db = await dbManager.db();
		const testsCollection = db.collection(`${message.guild.id}Tests`);
		await testsCollection.updateOne({ "questions.messageId": message.reference.messageID }, { $addToSet: { "questions.$.answers": answer } });
		message.react("👌");
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
				const embed = new MessageEmbed()
					.setTitle(`Question ${index + 1}`)
					.setColor('#DAF7A6')
					.setDescription(`${question["question"]}`)
					.addFields(
						{ name: "1.", value: `${question["correct_answer"]}`, inline: true },
						{ name: "2.", value: `${question["incorrect_answers"][0]}`, inline: false },
						{ name: "3.", value: `${question["incorrect_answers"][1]}`, inline: false },
						{ name: "4.", value: `${question["incorrect_answers"][2]}`, inline: false }
					)
				const msg = await channel.send(embed)
				msg.react(reactions.one) // :one:
				msg.react(reactions.two) // :two:
				msg.react(reactions.three) // :three:
				msg.react(reactions.four)
				msg.react(reactions.white_check_mark) // :white_check_mark:
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
