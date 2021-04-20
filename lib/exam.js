import { MessageEmbed } from "discord.js";

export class HandleExam {
    /**
     * Document to save into database
     * @param {string} testName
     * @param {string} userId
     * @param {Number} examDate
     * @param {Array[any]} questions
     * @param {Array[any]} answers
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
     * @param {Exam} Exam
     * @param {Exam.question} questionIndex
     * @param {string} answer
     */
    static setAnswer(Exam, questionIndex, answer) {
        // TODO implemend mongodb.findAndModify(Exam,questionIndex,answer)

    }
    /**
     * @param {Exam} Exam
     */
    static append(Exam) {
        // TODO implement mongodb.insert(Exam)
    }
    /**
 * Shuffles elements of the Array
 * @param {Array[any]} array 
 */
    static shuffleArray(array) {
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
 * Prepare embed message for one question
 * @param {Exam.question} question Trivia's question format
 * @param {number} index Index of a question
 * @param {boolean} shuffle if True, put questions in random order
 */
    static embedMessage(question, index, shuffle = true) {
        const embed = new MessageEmbed()
            .setTitle(`Question ${index + 1}`)
            .setColor('#DAF7A6')
            .setDescription(`${question["question"]}`)
        let questionList = [`${question["correct_answer"]}`]
        for (let wrong_question of question["incorrect_answers"]) {
            questionList.push(wrong_question);
        }
        if (shuffle) {
            questionList = this.shuffleArray(questionList)
        }
        let questions = questionList.map((el, i) => {
            return { name: `${i + 1}.`, value: `${el}` }
        })
        embed.addFields(questions)
        return embed;
    }

}
export class Exam {
    /**
 * Creates a test (as an object, save to database somewhere else).
 * @param {import("testManager.js").Test} test Test object containg settings and questions
 * @param {string} userId Uczen's userId form discord
 * @param {import("discord.js").Snowflake} channel The discord channel object where the test is
 */
    constructor(test, userId, channel) {
        this.test = test;
        this.userId = userId;
        this.channel = channel;
        this.startTime = ""
        this.endTime = ""
    }
    static questionIndex = -1;
    static question = {
        "category": "",
        "type": "",
        "difficulty": "",
        "question": "",
        "correct_answer": "",
        "incorrect_answers": []
    }
    /**
     * @param {Exam.question} questions
     */
    static setQuestions(questions) {
        this.questions = questions;
    }
    static next() {
        if (this.isNext()) {
            this.questionIndex += 1;
            return this.questions[this.questionIndex];
        }
    }
    static isNext() {
        return this.questionIndex + 1 <= this.questions.length;
    }

}
// const collector = msg.createReactionCollector(filter, { time: 15000 });
// collector.on('collect', (reaction, user) => {
//     console.log(`Collected ${reaction.emoji.name} from ${user.tag}`);
// });

// collector.on('end', collected => {
//     console.log(`Collected ${collected.size} items`);
// });
// const filter = (reaction,user) => {
//     return reaction.emoji.name === reactions.white_check_mark;
// };

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