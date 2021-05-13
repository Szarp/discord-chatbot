export const noAdminPermisionsString = "Only server administrators can use this command";
export const noOrManyRoleMentionString = "Exactly one role must be mentioned in this command";
export const helpMessageString = `Available commands:
\`!help\` show this help message
\`!create testname\` create a test called *testname*
\`!question multi|text questiontext\` add a question to the most recently created test. Use \`multi\` to denote a multiple choice question or \`text\` if there are no predefined answers
\`correct|wrong answer\` add an answer. Use \`correct\` or \`wrong\` whether the answer should be considered correct. **Must be in response to a \`!question\` message.**
\`!teacherrole @teacherRole\` add the role \`teacherRole\` as a recognised teacher role. Can be sent only by administrators.
\`!studentrole @studentRole\` add the role \`studentRole\` as a recognised student role. Can be sent only by administrators.`;
export const roleTeacherRequiredString = "Teacher role is required to use this command.";

// reactions
// {"one" | "two" | "three" | "four"}
export const reactions = {
	"one": "1️⃣", // :one:
	"two": "2️⃣", // :two:
	"three": "3️⃣", // :three:
	"four": "4️⃣",
	"white_check_mark": "✅", // :white_check_mark:
	"red_square": "🟥",
	"green_square": "🟩",
	"wastebasket": "🗑️",
	"gear": "⚙️",
	"emojiIndex": ["one", "two", "three", "four"]

};
/**
 * @param {string} st
 * @param {string} dur
 * @param {string} et
 */
export function rules(st,dur,et){
	return `
	\`Czas egzaminu jest z gry ustawiony. Uruchamia sie automatcznie o ${st.slice(0,-40)}, na kazde pytanie mozna odpowiedzec wylacznie raz. Czas na odpowiedz wynosi ${dur}s
	\n Po uplywie czasu lub dodaniu reakcji ${reactions.white_check_mark} przechodzimy do kolejnego pytania. W celu zaznaczenia odpoweidzi nalezy dodac reakcje z odpowiadajacym numerem odpowiedzie.
	\n Powodznia!

	Test zostanie usuniety o ${et}. Wyniki zostana opublikowane po zakonczeniu testu
	`;
}

