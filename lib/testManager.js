// FIXME: The structure of this file is a mess. Which methods should belong to which class and what are the relations
// between them?

// import * as mongodb from "mongodb";
import dbManager from "./db.js";
import { getQuestions } from "./openTestDb.js";
import { reactions } from "./messageStrings.js";
import { Exam, HandleExam } from "./exam.js";
import { MessageEmbed } from "discord.js";
import * as chrono from 'chrono-node';
import { createExamChannel, createTestChannel } from "./classroom.js";
import { getStudents } from "./privileges.js";
import * as messageStrings from "./messageStrings.js";

export class Test {
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
		this.starttime = "";
		this.endtime = "";
		this.duraction = 0;
		this.questionTime = 0;
		// this.messageId = messageId;
		/** @type {Question[]} */
		this.questions = [];
		// this.answers = [];
	}
}
class Question {
	/**
	 * Creates a new question
	 * @param {string} name The question
	 * @param {keyof typeof QuestionType} type The type of the question
	 */
	constructor(name) {
		this.question = name;
		/** @type string[] */
		this.correct_answers = [];
		/** @type string[] */
		this.incorrect_answers = [];
	}
	/**
	 * @param {string[]} arr
	 */
	addCorrectAnswer(arr){
		this.correct_answers = arr;
	}
	/**
	 * @param {string[]} arr
	 */
	addWrongAnswer(arr){
		this.incorrect_answers = arr;
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
				.setDescription(`${question["question"]}`);
			let answers = [...question["incorrect_answers"],...question["correct_answers"]];
			console.log("ans",answers)
			let answersList = answers.map((el, i) => {
				return { name: `${i + 1}.`, value: `${el}` }
			})
			embed.addFields(answersList)
			return embed;
		}
	}
	/**
	 * @param {string} id
	 * @param {string} guild
	 */
	static async showTest(id, guild) {
		const db = await dbManager.db();
		const testsCollection = db.collection(`${guild}Tests`);
		let test = await testsCollection.findOne({ channelID: id });
		return test;

	}
	/**
	 * @param {string} id
	 * @param {string} guild
	 */
	static async showResults(id, guild) {
		const db = await dbManager.db();
		const testsCollection = db.collection(`${guild}Exam`);
		let test = await testsCollection.find({ testId: id });
		return test;

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
	 * @param {Question} question The question content
	 * @param {string} guild Id of a guild
	 * @param {string} id Channel id
	 */
	static async addQuestion(question, guild, id) {
		try {
			console.log("Adding question");
			const db = await dbManager.db();
			const testsCollection = db.collection(`${guild}Tests`);
			// const question = new Question(questionText);
			await testsCollection.updateOne({ channelID: id }, { $addToSet: { questions: question } });
			let doc = await testsCollection.findOne({ channelID: id });
			await testsCollection.updateOne({ channelID: id }, { $set: { activeQuestion: doc.questions.length - 1 } });
			return;
		} catch (e) {
			return e;
		}
	}
	/**
	 * Adds a question to the specified (or most recently created) test.
	 * @param {string} value The question content
	 * @param {string} key The type of the question
	 * @param {string} guild Id of a guild
	 * @param {string} id Channel id
	 */
	static async updateOneValue(key, value, guild, id) {
		try {
			const db = await dbManager.db();
			const testsCollection = db.collection(`${guild}Tests`);
			await testsCollection.updateOne({ channelID: id }, { $set: { [key]: value } });
			// let col = await testsCollection.findOne({ channelID: id });
			// console.log(col);
			return await testsCollection.findOne({ channelID: id });
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
			// const answer = new Answer(content, correct);
			const db = await dbManager.db();
			const testsCollection = db.collection(`${guild}Tests`);
			let { activeQuestion } = await testsCollection.findOne({ channelID: id })
			if (correct)
				await testsCollection.updateOne({ channelID: id },
					{ $addToSet: { [`questions.${activeQuestion}.correct_answers`]: content } });
			else
				await testsCollection.updateOne({ channelID: id },
					{ $addToSet: { [`questions.${activeQuestion}.incorrect_answers`]: content } });
			return;
		} catch (e) {
			return e;
		}
	}
	// /**
	//  * Checks if a message is a response to a saved question
	//  * @param {import("discord.js").Message} message The received message
	//  * @returns {Promise<boolean>} Whether the message is a response to a question
	//  */
	// static async isResponseToQuestion(message) {
	// 	if (!message.guild?.available || !message.reference?.messageID) {
	// 		return false;
	// 	}
	// 	const db = await dbManager.db();
	// 	const testsCollection = db.collection(`${message.guild.id}Tests`);
	// 	const matchedTest = await testsCollection.findOne({ "questions.messageId": message.reference.messageID });
	// 	return matchedTest !== undefined;
	// }

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
/**
 * Parser for test commands
 * @param {*} param0 
 * @param {import("discord.js").Message} message 
 */
export async function routeTestMessage({ method, args }, message) {
	let guild, id;
	switch (method) {
		case "q":
		case "question":
			let [...questionText] = args;
			if (questionText) {
				let q = new Question(questionText);
				TestManager.addQuestion(q, message.guild.id, message.channel.id);
				return addQuestionWrapper({ questionText: questionText.join(" ") }, message.guild, message.channel);
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
					await channel.setParent(parentID, { lockPermissions: false })
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
			if(elemToShow == "answers"){
				let res = await TestManager.showResults(message.channel.id, message.guild.id);
				console.log(res);
			}
			break;
		case "trivia":
			const [numStr] = args 
			const number = parseInt(numStr);
			const questions = await getQuestions(number);
			// questions.forEach(function(obj) {
			// 	obj["correct_answers"] = [obj.correct_answer];
			// 	delete obj.correct_answer;
			//   });

			for (let k in questions){
				let q = new Question(questions[k].question)
				q.addCorrectAnswer([questions[k].correct_answer])
				q.addWrongAnswer(questions[k].incorrect_answers)
				await TestManager.addQuestion(q, message.guild.id, message.channel.id);
			}
			break;
		case "a":
		case "answer":
			let [type, ...answerText] = args;
			if (type == "correct" || type == 'wrong')
				TestManager.addAnswer(answerText.join(" "), type, message.channel.id, message.guild.id);
			break;
		case "start":
			[guild, id] = [message.guild, message.channel.id]
			let students = await getStudents(message.guild);
			let studentsId = students.map(m => m.user.id)
			let studentsNames = students.map(m => m.user.username)
			const privateParentID = "824035326624137277";
			console.log(studentsId, studentsNames);
			let test = await TestManager.showTest(message.channel.id, guild.id);
			console.log(test);
			for (let k in studentsId) {

				let privChannel = await createExamChannel(guild, `test_${studentsNames[k]}`, studentsId[k])
				await privChannel.setParent(privateParentID, { lockPermissions: false })
				return HandleExam.createExamDb(test,{userId:studentsId[k],usename:studentsNames[k]},privChannel.id,guild.id)
				//TODO add timer 
				// return createTestWrapper(testName, privCahnnel.id, message.guild.id);
			}

			/* NOTES
				- kanał moze byc od studenta i egzaminu
				- kanał nalezy archiwizować
				- usuwane są wyłącznie kanały, nie obiekty z bazy
				- operujemy na liście egzaminów
				- wyświetlanie wyników



			*/
			// TODO Strat Exams for them
			// TODO Collect answers
			break;
		case "set":
			let [key, ...value] = args;
			let msg = `Set ${key} as: `;
			[guild, id] = [message.guild.id, message.channel.id]
			let val;
			switch (key) {
				case "starttime":
				case "st":
					val = chrono.parseDate(value.join(" "))
					if (!val) { break; } //???
					// console.log(new Date().getTime()- new Date(val.toString()).getTime());
					updateStarttime(val.toString(), guild, id)
					msg += val.toString();
					break;
				case "endtime":
				case "et":
					val = chrono.parseDate(value.join(" "))
					if (!val) { break; }
					updateEndtime(val.toString(), guild, id)
					msg += val.toString();
					break;
				case "duraction":
				case "dur":
					val = parseInt(value) + "";
					updateDuraction(val, guild, id);
					msg += `${val}min`;
					break;
				case "questiontimer":
				case "qt":
					val = parseInt(value) + "";
					updateQuestiontime(val, guild, id);
					msg += `${val}s`;
					break;
				default:
					msg = `Can't parse the ${key}:"${value.join(" ")}"`
			}
			message.channel.send(msg);
			break;
		case "collect":
			let test1 = await TestManager.showTest(message.channel.id, message.guild.id);
			console.log(test1);
			console.log(new Exam(test1,"id1","channelId"))
			// console.log(message.channel.parentID);
			// let test1 = await TestManager.showTest(message.channel.id, message.guild.id);
			// console.log(test1);
			break;
		default:
			console.log(`TODO: ${method},${args}`)
			break;
	}
}
	/**
	 * @param {string} value
	 * @param {string} guild
	 * @param {string} id
	 */
	async function updateStarttime(value, guild, id) {
		TestManager.updateOneValue("starttime", value, guild, id)
	}
	/**
 * @param {string} value
 * @param {string} guild
 * @param {string} id
 */
	async function updateEndtime(value, guild, id) {
		TestManager.updateOneValue("endtime", value, guild, id)
	}
	/**
 * @param {string} value
 * @param {string} guild
 * @param {string} id
 */
	async function updateDuraction(value, guild, id) {
		TestManager.updateOneValue("duraction", value, guild, id)
	}
	/**
 * @param {string} value
 * @param {string} guild
 * @param {string} id
 */
	async function updateQuestiontime(value, guild, id) {
		TestManager.updateOneValue("questionTime", value, guild, id)
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
// 	/**
// 	 * @param {*} match
// 	 * @param {import("discord.js").Message} message
// 	 */
// 	function addQuestionWrapper({ questionText }, { id: guild }, { id }) {
// 		// const type = multi === undefined ? QuestionType.text : QuestionType.multi;
// 		TestManager.addQuestion(questionText, guild, id);
// 	}
// }