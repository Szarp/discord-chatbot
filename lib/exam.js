import { Message, MessageEmbed } from "discord.js";
import { reactions } from "./messageStrings.js";
import { getQuestions } from "./openTestDb.js";
import dbManager from "./db.js";

export class HandleExam {
    /**
     * Tries to create a new test with a give name. Fails (softly) if not received on a server or if a test with
     * such name already exists.
     * @param {*} test
     * @param {*} param0
     * @param {string} channelID
     * @param {string} guild Received !create (or however it will be called) message
     */
    static async createExamDb(test, {userId,username}, channelID, guild) {
        try {
            const db = await dbManager.db();
            const testsCollection = db.collection(`${guild}Exam`);
            if (await testsCollection.findOne({ userId: userId, channelID: channelID }) !== undefined) {
                throw new Error("Exam exist");
            }
            const exam = new Exam(test, {userId:userId,username:username}, channelID);
            await testsCollection.insertOne(exam);
            return;
        } catch (e) {
            return e;
        }
    }
    /**
     * Tries to create a new test with a give name. Fails (softly) if not received on a server or if a test with
     * such name already exists.
     * @param {string} id
     * @param {string} guild Received !create (or however it will be called) message
     */
    static async readExamDb(id, guild) {
        try {
            const db = await dbManager.db();
            const testsCollection = db.collection(`${guild}Exam`);
            return  await testsCollection.findOne({ channelID: id })
            // const exam = new Exam(test, userId, channelID);
            // await testsCollection.insertOne(exam);
            // return;
        } catch (e) {
            return e;
        }
    }
    /**
     * Tries to create a new test with a give name. Fails (softly) if not received on a server or if a test with
     * such name already exists.
     * @param {string} id
     * @param {string} guild Received !create (or however it will be called) message
     * @param {any[]} answers
     */
    static async saveExamAnswers(answers,id, guild) {
        try {
            const db = await dbManager.db();
            const testsCollection = db.collection(`${guild}Exam`);
            await testsCollection.updateOne({ channelID: id }, { $set: { userAnswers: answers, done:true } });
            // return  await testsCollection.findOne({ channelID: channelID })
            // const exam = new Exam(test, userId, channelID);
            // await testsCollection.insertOne(exam);
            // return;
        } catch (e) {
            return e;
        }
    }
    /**
     * @param {Number} numberOfQuestions
     * @param {Message} message
     */
    async attachReactions(numberOfQuestions, message) {
        for (let i = 0; i < numberOfQuestions; i++) {
            /** @type {"one" | "two" | "three" | "four"}}*/
            let emojiKey = reactions.emojiIndex[i];
            await message.react(reactions[emojiKey]);
        }
        await message.react(reactions.white_check_mark);
    }
    /**
     * @param {import("discord.js").TextChannel } channel
     * @param {number} numberOfQuestions
     * @param {Exam | null} exam
     */
    async initExam(channel, numberOfQuestions, exam = null) {
        const questions = await getQuestions(numberOfQuestions);
        if (!exam) {
            exam = new Exam("", "UserId", "");
            exam.setQuestions(questions);
        }
        this.parseExam(exam, channel);
    }
        /**
     * @param {import("discord.js").TextChannel } channel
     * @param {string} guild
     */
    async initExam2(channel,guild) {
        let examFromDb = await HandleExam.readExamDb(channel.id, guild)
        
        if (!examFromDb["done"]){
                let exam = new Exam(examFromDb, {userId:"",username:""}, "")
                console.log(exam)
                let answers = await this.parseExam(exam, channel);
                HandleExam.saveExamAnswers(answers,channel.id, guild)
        }else{
            channel.send("Test has been writen");
        }
        
    }
    /**
     * @param {import("discord.js").ReactionManager} messReactions
     */
    static getMessageReactions({ cache }) {
        let choosedReactions = cache.filter((el) =>
            // @ts-ignore
            (el.count > 1 && el._emoji.name != reactions.white_check_mark))
        /** @type {string[]} */
        let emojiArray = []
        // @ts-ignore
        choosedReactions.map((el) => emojiArray.push(el._emoji.name))
        return emojiArray;
    }
    /**
     * @param {import("discord.js").Message} message
     * @param {number} timeout
     */
    async handdleReactionCollector(message, timeout) {
        try {
            await message.awaitReactions(HandleExam.filter, // fliter for whitecheck mark only
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
     * @param {Number} answerIndex
     * @param {Number} timeout
     * @param {Number} numberOfQuestions
     */
    async handleReaction(message, answerIndex, numberOfQuestions, timeout = 10000) {
        this.attachReactions(numberOfQuestions, message);
        let timedOut = await this.handdleReactionCollector(message, timeout);
        let userReactions = HandleExam.getMessageReactions(message.reactions);
        // @ts-ignore
        let correct_reactions = answerIndex.map(el => {
            // @ts-ignore
            return reactions[reactions.emojiIndex[el]]
        });
        return {
            "questionCorrectReaction": correct_reactions,
            "userSetReaction": userReactions,
            "timedOut": timedOut
        }
    }
    /**
     * Shuffles elements of the Array
     * @param {string[]} array 
     */
    static shuffleQuestions(array) {
        var currentIndex = array.length, temporaryValue, randomIndex;
        // While there remain elements to shuffle...
        while (0 !== currentIndex) {
            // Pick a remaining element...
            randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex -= 1;
            // And swap it with the current element.
            temporaryValue = array[currentIndex];
            array[currentIndex] = array[randomIndex];
            array[randomIndex] = temporaryValue;
        }
        return array;
    }
    /**
     * 
     * @param {*} question 
     * @param {boolean} shuffle 
     */
    static parseQuestionAnswers({ incorrect_answers, correct_answers }, shuffle) {
        /** @type {string[]} */
        let questionList = [...correct_answers,...incorrect_answers];
        if (shuffle) {
            questionList = this.shuffleQuestions(questionList)
        }
        // @ts-ignore
        let answerIndex = correct_answers.map(el => {
            return questionList.indexOf(el)
        });
        return {
            "questionList": questionList,
            "answerIndex": answerIndex
        };

    }
    /**
     * @param {Exam} exam
     * @param {any} channel
     * @param {boolean} shuffle
     */
    // @ts-ignore
    async parseExam(exam, channel, shuffle = true) {
        /** @type {import("./openTestDb.js").OpentdbQuestion |null} */
        let text;
        while (exam.isNext()) {
            text = exam.next();
            // @ts-ignore
            let { embedMessage, answerIndex, numberOfQuestions } = HandleExam.embedMessage(text, exam.questionIndex)
            let msg = await channel.send(embedMessage);
            let questionAnswer = await this.handleReaction(msg, answerIndex, numberOfQuestions,exam["questionTime"]*1000);
            exam.setAnswer(questionAnswer);

        }
        console.log(exam.getAnswers());
        let retMsg = "";
        let ans = exam.getAnswers()
        for (let k in ans) {
            let quest = ans[k];
            if (quest.userSetReaction.length == 1 && quest.userSetReaction[0] == ans[k].questionCorrectReaction)
                retMsg += reactions.green_square;
            else
                retMsg += reactions.red_square;

        }
        channel.send(retMsg);
        return exam.getAnswers();

    }
    /**
     * Prepare embed message for one question
     * @param {import("./openTestDb.js").OpentdbQuestion} question Trivia's question format
     * @param {Number} index Index of a question
     * @param {boolean} shuffle if True, put questions in random order
     */
    static embedMessage(question, index, shuffle = true) {
        const embed = new MessageEmbed()
            .setTitle(`Question ${index + 1}`)
            .setColor('#DAF7A6')
            .setDescription(`${question["question"]}`)
        let { questionList, answerIndex } = HandleExam.parseQuestionAnswers(question, shuffle);
        let questions = questionList.map((el, i) => {
            return { name: `${i + 1}.`, value: `${el}` }
        })
        embed.addFields(questions)
        return {
            "embedMessage": embed,
            "answerIndex": answerIndex,
            "numberOfQuestions": questionList.length
        };
    }
    /**
     * @param {import("discord.js").MessageReaction} reaction
     * @param {import("discord.js").User} user
     */
    static filter({ emoji }, { id }) {
        return emoji.name == reactions.white_check_mark;

    };
}
// @ts-ignore
export class Exam {
    /**
     * Creates a test (as an object, save to database somewhere else).
     * @param {import("testManager.js").Test} test Test object containg settings and questions
     * @param {*} param0 The discord channel object where the test is
     * @param {string} channel
     */
    constructor({ starttime, endtime, duraction, questionTime, questions,channelID }, {userId,username}, channel) {
        // this.test = test;
        this.testId = channelID;
        this.username = username
        this.userId = userId;
        this.channelID = channel;
        this.starttime = starttime;
        this.endtime = endtime;
        this.duraction = duraction;
        this.questionTime = questionTime;
        // this.messageId = messageId;
        /** @type {Question[]} */
        this.questions = questions;
        this.questionIndex = -1;
        // @ts-ignore
        this.answers = [];
    }
    /**
     * @param {import("./openTestDb.js").OpentdbQuestion[]} questions
     */
    setQuestions(questions) {
        this.questions = questions;
    }/**
     * 
     * @param {any} answer 
     */
    // @ts-ignore
    setAnswer(answer) { //TODO
        // @ts-ignore
        this.answers[this.questionIndex.toString()] = answer;
    }
    getAnswers() { //TODO
        return this.answers;
    }
    /**
     * Send next question
     */
    next() {
        if (this.isNext()) {
            this.questionIndex += 1;
            return this.questions[this.questionIndex];
        }
        return null;
    }
    /**
     * Check if there is next question
     */
    isNext() {
        return ((this.questionIndex + 1) < this.questions.length);
    }
}