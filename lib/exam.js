import { Message, MessageEmbed } from "discord.js";
import { reactions } from "./messageStrings.js";
import { getQuestions } from "./openTestDb.js";


export class HandleExam {
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
     * @param {import("discord.js").ReactionManager} messReactions
     */
    static getMessageReactions({ cache }) {
        let choosedReactions = cache.filter((el) =>
            (el.count > 1 && el._emoji.name != reactions.white_check_mark))
        /** @type {string[]} */
        let emojiArray = []
        choosedReactions.map((el) => emojiArray.push(el._emoji.name))
        return emojiArray;
    }
    /**
     * @param {import("discord.js").Message} message
     * @param {number} timeout
     */
    async handdleREactionCollector(message, timeout) {
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
        let timedOut = await this.handdleREactionCollector(message, timeout);
        let userReactions = HandleExam.getMessageReactions(message.reactions);
        let correct_reaction = reactions[reactions.emojiIndex[answerIndex]];
        // console.log(ret, "was correct", ret == correct_reaction);
        return {
            "questionCorrectReaction": correct_reaction,
            "userSetReaction": userReactions,
            "timedOut": timedOut
        }
    }
    /**
     * Document to save into database
     * @param {string} testName
     * @param {string} userId
     * @param {Number} examDate
     * @param {import("./openTestDb.js").OpentdbQuestion[]} questions
     * @param {string[]} answers
     */
    static dbDocumentFormat(testName, userId, examDate, questions, answers) {
        return {
            "testName": testName,
            "userId": userId,
            "date": examDate,
            "questions": questions,
            "answers": answers
        }
    }
    /**
     * Shuffles elements of the Array
     * @param {[string]} array 
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
     * @param {import("./openTestDb.js").OpentdbQuestion} question 
     * @param {boolean} shuffle 
     */
    static parseQuestionAnswers({ incorrect_answers, correct_answer }, shuffle) {
        /** @type {[string]} */
        let questionList = [correct_answer];
        for (let wrong_question of incorrect_answers) {
            questionList.push(wrong_question);
        }
        if (shuffle) {
            questionList = this.shuffleQuestions(questionList)
        }
        return {
            "questionList": questionList,
            "answerIndex": questionList.indexOf(correct_answer)
        };

    }
    /**
     * @param {Exam} exam
     * @param {any} channel
     * @param {boolean} shuffle
     */
    async parseExam(exam, channel, shuffle = true) {
        /** @type {import("./openTestDb.js").OpentdbQuestion |null} */
        let text;
        while (exam.isNext()) {
            text = exam.next();
            let { embedMessage, answerIndex, numberOfQuestions } = HandleExam.embedMessage(text, exam.questionIndex)
            let msg = await channel.send(embedMessage);
            let questionAnswer = await this.handleReaction(msg, answerIndex, numberOfQuestions);
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
export class Exam {
    /**
 * Creates a test (as an object, save to database somewhere else).
 * @param {import("testManager.js").Test} test Test object containg settings and questions
 * @param {string} userId Uczen's userId form discord
 * @param {import("discord.js").TextChannel } channel The discord channel object where the test is
 */
    constructor(test, userId, channel) {
        this.test = test;
        this.userId = userId;
        this.channel = channel;
        this.startTime = "";
        this.endTime = "";
        /** @type {number} */
        this.questionIndex = -1;
        /** @type {import("./openTestDb.js").OpentdbQuestion[]} */
        this.questions = [];
        this.answers = {};
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
    /**
     * @param {{ questionCorrectReaction: any; userSetReaction: string[]; timedOut: boolean; }} answer
     */
    setAnswer(answer) {
        this.answers[this.questionIndex.toString()] = answer;
    }
    getAnswers() {
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