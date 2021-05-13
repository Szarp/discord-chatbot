import dbManager from "./db.js";
import { getQuestions } from "./openTestDb.js";
import { reactions, rules } from "./messageStrings.js";
import { HandleExam } from "./exam.js";
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
	addCorrectAnswer(arr) {
		this.correct_answers = arr;
	}
	/**
	 * @param {string[]} arr
	 */
	addWrongAnswer(arr) {
		this.incorrect_answers = arr;
	}
}
/**
 * @param {string} channelID
 * @param {import("discord.js").Message} message
 */
export async function readTest(channelID, message) {
	// @ts-ignore
	const { guild, channel, id: testMsgId } = message;
	const db = await dbManager.db();
	// @ts-ignore
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
		// @ts-ignore
		return [embedQuestionList, questions];
		/**
		 * @param {Question[]} question
		 * @param {number} index
		 */
		function embedQuestion(question, index) {
			const embed = new MessageEmbed()
				.setTitle(`Question ${index + 1}`)
				.setColor('#DAF7A6')
				// @ts-ignore
				.setDescription(`${question["question"]}`);
			// @ts-ignore
			let answers = [...question["incorrect_answers"], ...question["correct_answers"]];
			console.log("ans", answers)
			if (answers.length > 0) {
				let answersList = answers.map((el, i) => {
					return { name: `${i + 1}.`, value: `${el}` }
				})
				embed.addFields(answersList)
			}
			else {
				embed.addFields({ name: "No answers", value: "0" })
			}
			return embed;
		}
	}
	/**
	 * @param {string} id
	 * @param {string} guild
	 */
	// @ts-ignore
	static async showAnswers(result, id, guild) {
		// @ts-ignore
		let answers = result.map(el => {
			return {
				name: el.username,
				questions: el.questions,
				answers: el.userAnswers
			}
		})
		let embedQuestionList = []
		for (let k = 0; k < answers.length; k++) {
			// @ts-ignore
			embedQuestionList.push(embedAnswer(answers[k], k))
		}
		return embedQuestionList;
		// @ts-ignore
		function embedAnswer({ name, questions, answers }) {
			const embed = new MessageEmbed()
				.setTitle(`User ${name}`)
				.setColor('#DA07A6')
				.setDescription(`${name}`);
			// let answers = [...question["incorrect_answers"],...question["correct_answers"]];
			console.log("ans", answers, questions)
			if (answers) {
				// @ts-ignore
				let answersList = answers.map((el, i) => {
					return { name: `${i + 1}. ${questions[i].question}`, value: `${getResults(el) ? "correct" : "wrong"}` }
				})
				embed.addFields(answersList)
			}
			else {
				embed.addFields({ name: "No answers", value: "0" })
			}
			return embed;
		}
		// @ts-ignore
		function getResults({ questionCorrectReaction: a, userSetReaction: b }) {
			if (a === b) return true;
			if (a == null || b == null) return false;
			if (a.length !== b.length) return false;

			// If you don't care about the order of the elements inside
			// the array, you should sort both arrays here.
			// Please note that calling sort on an array will modify that array.
			// you might want to clone your array first.

			for (var i = 0; i < a.length; ++i) {
				if (a[i] !== b[i]) return false;
			}
			return true;
		}
		// @ts-ignore
		function getResults1({ questionCorrectReaction: correct, userSetReaction: user }) {
			// @ts-ignore
			let diff = correct.filter(x => !user.includes(x));
			if (diff == null)
				return 0;
			else
				return diff.length;
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
		let test = await testsCollection.find({ testId: id }).toArray();
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
	 * @param {Question} question The question content
	 * @param {string} guild Id of a guild
	 * @param {string} id Channel id
	 */
	static async deleteQuestion(question, guild, id) {
		try {
			console.log("Deleting question");
			const db = await dbManager.db();
			const testsCollection = db.collection(`${guild}Tests`);
			// @ts-ignore
			await testsCollection.updateOne({ channelID: id }, { $pull: { questions: { "question": question.question } } });
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
}
/**
 * Parser for test commands
 * @param {*} param0 
 * @param {import("discord.js").Message} message 
 */
export async function routeTestMessage({ method, args }, message) {
	switch (method) {
		case "q":
		case "question":
			routeTestQuestion(args, message);
			break;
		case "create":
			routeTestCreate(args, message);
			break;
		case "read":
			await readTest(message.channel.id, message);
			break;
		case "show":
			routeTestShow(args, message);
			break;
		case "trivia":
			const [numStr] = args
			const number = parseInt(numStr);
			const questions = await getQuestions(number);
			for (let k in questions) {
				let q = new Question(questions[k].question)
				q.addCorrectAnswer([questions[k].correct_answer])
				q.addWrongAnswer(questions[k].incorrect_answers)
				// @ts-ignore
				await TestManager.addQuestion(q, message.guild.id, message.channel.id);
			}
			break;
		case "a":
		case "answer":
			let [type, ...answerText] = args;
			if (type == "correct" || type == 'wrong')
				// @ts-ignore
				TestManager.addAnswer(answerText.join(" "), type, message.channel.id, message.guild.id);
			break;
		case "start":
			routeTestStart(args, message);
			break;
		case "set":
			routeTestSettings(args, message)
			break;
		default:
			console.log(`TODO: ${method},${args}`)
			break;
	}
}
/**
 * @param {string[]} args
 * @param {import("discord.js").Message} message
 */
// @ts-ignore
export async function routeTestStart(args, message) {
	// @ts-ignore
	let [guild, id] = [message.guild, message.channel.id]
	// @ts-ignore
	let students = await getStudents(message.guild);
	let studentsId = students.map(m => m.user.id)
	let studentsNames = students.map(m => m.user.username)
	const privateParentID = "824035326624137277";

	/** typeof Test() */
	// @ts-ignore
	let test = await TestManager.showTest(message.channel.id, guild.id);
	if (test.starttime == "" || test.questionTime == "" || test.endtime == "") {
		message.channel.send(`Podaj wszytskie potrzebne czasy: \nstarttime:${test.starttime}\nendtime:${test.endTime}\nquestiontime:${test.questionTime}`);
		return;
	}
	const time = Date.now()
	if (new Date(test.starttime).getTime() < time || test.endtime < test.starttime) {
		message.channel.send(`Czas rozpoczecia testu juz minal.`)
		return;
	}
	message.channel.send(`Stworzono Exam dla ${studentsId.length} Uczniow`)
	// console.log(test);
	for (let k in studentsId) {

		let privChannel = await createExamChannel(guild, `test_${studentsNames[k]}`, studentsId[k])
		await privChannel.setParent(privateParentID, { lockPermissions: false })
		// await privChannel.overwritePermissions(k,{ 'SEND_MESSAGES': false,"VIEW_CHANNEL":true,"ADD_REACTIONS":true })
		await privChannel.send(rules(test["starttime"], test["duraction"], test["endtime"]))
		// @ts-ignore
		await HandleExam.createExamDb(test, { userId: studentsId[k], username: studentsNames[k] }, privChannel.id, guild.id)
		// @ts-ignore
		
		setTimeout(() => {
			// @ts-ignore
			new HandleExam().initExam2(privChannel, guild.id)
			// @ts-ignore
		}, new Date(test["starttime"]) - Date.now());
		doSetTimeout(guild,privChannel.id,new Date(test["endtime"]) - Date.now());
	}
	/**
	 * 
	 * @param {*} guild 
	 * @param {*} id 
	 * @param {*} time 
	 */
	function doSetTimeout(guild,id,time) {
		
		setTimeout(function() {
			let fetchedChannel = guild.channels.cache.get(id);
			fetchedChannel.delete();
		 }, time);
	  }
}
// @ts-ignore
function getMessageQuestionEditReactions({ cache }) {
	// @ts-ignore
	let choosedReactions = cache.filter((el) =>
		// @ts-ignore
		(el.count > 1 && el._emoji.name == reactions.wastebasket))
	/** @type {string[]} */
	let emojiArray = []
	// @ts-ignore
	choosedReactions.map((el) => emojiArray.push(el._emoji.name))
	return emojiArray.length > 0;
}
/**
 * @param {import("discord.js").Message} message
 * @param {number} timeout
 */
async function handdleQuestionEditCollector(message, timeout) {
	try {
		// @ts-ignore
		await message.awaitReactions(({ emoji }, { id }) => {
			return emoji.name == reactions.wastebasket;

		}, // fliter for whitecheck mark only
			{
				max: 2, // bot first check
				time: timeout,
				errors: ['time']
			})
		return false;
	} catch (e) {
		return true;
	}
}
/**
 * @param {import("discord.js").Message} message
 * @param {any} question
 * @param {Number} timeout
 */
// @ts-ignore
export async function handleQuestionEditReaction(message, question, timeout = 60 * 1000) {
	// @ts-ignore
	let timedOut = await handdleQuestionEditCollector(message, timeout);
	let wantDelate = getMessageQuestionEditReactions(message.reactions);
	if (wantDelate) {
		// @ts-ignore
		TestManager.deleteQuestion(question, message.guild?.id, message.channel.id);
		message.channel.send(`Deleted question with title: ${question.question}`)
	}
}

/**
 * @param {string[]} args
 * @param {import("discord.js").Message} message
 */
export async function routeTestShow(args, message) {
	let [elemToShow] = args;
	if (elemToShow == "questions") {
		// @ts-ignore
		let [embedMessage, questions] = await TestManager.showQuestions(message.channel.id, message.guild.id);
		console.log(embedMessage);
		let sendedEmbeds = []
		// @ts-ignore
		for (let k in embedMessage) {
			let msg = await message.channel.send(embedMessage[k]);
			sendedEmbeds.push(msg);
		} for (let i in sendedEmbeds) {
			sendedEmbeds[i].react(messageStrings.reactions.gear)
			sendedEmbeds[i].react(messageStrings.reactions.wastebasket)
			handleQuestionEditReaction(sendedEmbeds[i], questions[i])
		}

	}
	if (elemToShow == "answers") {
		// @ts-ignore
		let res = await TestManager.showResults(message.channel.id, message.guild.id)
		let embedMessage = await TestManager.showAnswers(res, "", "");
		let sendedEmbeds = []
		for (let k in embedMessage) {
			let msg = await message.channel.send(embedMessage[k]);
			sendedEmbeds.push(msg);
		} for (let i in sendedEmbeds) {
			// TODO implement question edition 
			sendedEmbeds[i].react(messageStrings.reactions.gear)
			sendedEmbeds[i].react(messageStrings.reactions.wastebasket)
		}
	}
}
/**
 * @param {string[]} args
 * @param {import("discord.js").Message} message
 */
export async function routeTestCreate(args, message) {
	let [testName] = args;
	try {
		if (testName) {
			const channel = await createTestChannel(message.guild, testName);
			const parentID = "824034558009671700";
			await channel.setParent(parentID, { lockPermissions: false })
			// @ts-ignore
			return createTestWrapper(testName, channel.id, message.guild.id);
		}
	} catch (e) {
		message.channel.send(e + " ");
	}
}
/**
 * @param {string[]} args
 * @param {import("discord.js").Message} message
 */
export async function routeTestQuestion(args, message) {
	let [...questionText] = args;
	if (questionText.length > 0) {
		let q = new Question(questionText.join(" "));
		// @ts-ignore
		TestManager.addQuestion(q, message.guild.id, message.channel.id);
		// return addQuestionWrapper({ questionText: questionText.join(" ") }, message.guild, message.channel);
	}
	else {
		console.log("sth went wrong")
	}
}
/**
 * @param {string[]} args
 * @param {import("discord.js").Message} message
 */
export async function routeTestSettings(args, message) {
	let [key, ...value] = args;
	let msg = `Set ${key} as: `;
	// @ts-ignore
	let [guild, id] = [message.guild.id, message.channel.id]
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
			// @ts-ignore
			val = parseInt(value) + "";
			updateDuraction(val, guild, id);
			msg += `${val}min`;
			break;
		case "questiontimer":
		case "qt":
			// @ts-ignore
			val = parseInt(value) + "";
			updateQuestiontime(val, guild, id);
			msg += `${val}s`;
			break;
		default:
			msg = `Can't parse the ${key}:"${value.join(" ")}"`
	}
	message.channel.send(msg);
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
// @ts-ignore
function addQuestionWrapper({ questionText }, { id: guild }, { id }) {
	TestManager.addQuestion(questionText, guild, id);
}