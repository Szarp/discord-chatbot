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
     * @param {Exam | null} exam
     */
    async initExam(channel,exam = null) {
        const questions = await getQuestions(10);
        if(!exam){
            exam = new Exam("", "UserId", "");
            exam.setQuestions(questions);
        }
        let text = exam.next();
        let i = 0;
        while (text != null) {
            let { embedMessage, answerIndex, numberOfQuestions } = HandleExam.embedMessage(text, i)
            let msg = await channel.send(embedMessage);
            await this.handleReaction(msg, answerIndex, numberOfQuestions);
            i++;
            text = exam.next();
        }

    }
    // static mapEmojiNameToNumber(emojiName){
    // }
    /**
     * @param {import("discord.js").ReactionManager} messReactions
     */
    static getMessageReactions({cache}) {
        let choosedReactions = cache.filter((el) =>
            (el.count > 1 && el._emoji.name != reactions.white_check_mark))
        /** @type {string[]} */
        let emojiArray = []
        choosedReactions.map((el) => emojiArray.push(el._emoji.name))
        return emojiArray;
    }
    /**
     * @param {import("discord.js").Message} message
     * @param {Number} answerIndex
     * @param {Number} timeout
     * @param {Number} numberOfQuestions
     */
    async handleReaction(message, answerIndex, numberOfQuestions, timeout = 10000) {
        await this.attachReactions(numberOfQuestions, message)
        try {
            await message.awaitReactions(HandleExam.filter, // fliter for whitecheck mark only
                {
                    max: 2, // bot first check
                    time: timeout,
                    errors: ['time']
                })
            console.log("Done in time");
            let ret = HandleExam.getMessageReactions(message.reactions)
            let correct_reaction = reactions[reactions.emojiIndex[answerIndex]];
            console.log(ret, "was correct", ret == correct_reaction);
            return ret;

        } catch (e) {
            console.log(`Question timeout`);
            let ret = HandleExam.getMessageReactions(message.reactions)
            let correct_reaction = reactions[reactions.emojiIndex[answerIndex]];
            console.log(ret, "was correct", ret == correct_reaction);
            return ret;
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
     * @param {Exam} exam
     * @param {Number} questionIndex
     * @param {string} answer
     */
    static setAnswer(exam, questionIndex, answer) {
        // TODO implemend mongodb.findAndModify(Exam,questionIndex,answer)

    }
    /**
     * @param {Exam} exam
     */
    static append(exam) {
        // TODO implement mongodb.insert(Exam)
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
    static filter({ emoji }, {id}) {
        return emoji.name === reactions.white_check_mark;
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
        /** @type {Number} */
        this.questionIndex = -1;
        /** @type {import("./openTestDb.js").OpentdbQuestion[]} */
        this.questions = [];
    }
    /**
     * @param {import("./openTestDb.js").OpentdbQuestion[]} questions
     */
    setQuestions(questions) {
        this.questions = questions;
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
        return ((this.questionIndex + 1) <= this.questions.length);
    }

}


// TODO exam.on('white_mark_check') => nextQuestion()
// TODO exam.on('question_timeout') => nextQuestion()
// TODO exam.on('exam_timeout') => endExam()
// TODO exam('end_exam') => {
//     TODO showResults()
//     TODO saveResults()
//     TODO closeExam()
// }
// TODO exam('next_question') => {
//     TODO questionTimer('question_time')
//     TODO reactionCollector('true_answer','question_time')
// }
// TODO exam('question_timer')(time) => {
//     TODO setEventTimeHandler(time) => notify()
// }
// TODO exam('showResults') => {
//     TODO await sum = foreach(question.reactionCollector()) => getTrueAnswer()
//     TODO sendMsg(sum / questions.length)
// }

// TODO exam('save_result')=> {
//     TODO pushFullConversationToDatabase()
// }