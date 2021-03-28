const Discord = require("discord.js");
const dbManager = require("./db.js");
const { GuildUnavailableError, RolesNotAssigned } = require("./errors.js");

/**
 * Checks if a guild member is a teacher.
 * @param {Discord.GuildMember} guildMember The guild member whose role is checked
 */
async function isTeacher(guildMember) {
	const db = await dbManager.db();
	const configsCollection = db.collection("configs");
	const teacherRolesObj = await configsCollection.findOne({ _id: guildMember.guild.id }, { projection: { _id: 0, teacherRoles: 1 } });
	if (!Array.isArray(teacherRolesObj?.teacherRoles)) {
		return false;
	}
	return guildMember.roles.cache.some(role => {
		return teacherRolesObj.teacherRoles.contains(role.id);
	});
}

/**
 * Checks if a guild member is a student.
 * @param {Discord.GuildMember} guildMember The guild member whose role is checked
 */
async function isStudent(guildMember) {
	const db = await dbManager.db();
	const configsCollection = db.collection("configs");
	const studentRolesObj = await configsCollection.findOne({ _id: guildMember.guild.id }, { projection: { _id: 0, studentRoles: 1 } });
	if (!Array.isArray(studentRolesObj?.studentRoles)) {
		return false;
	}
	return guildMember.roles.cache.some(role => {
		return studentRolesObj.studentRoles.contains(role.id);
	});
}

/**
 * Returns an array of students in the given guild
 * @param {Discord.Guild} guild The guild which members will be returned
 * @returns {Promise<Discord.GuildMember[]>} An array of users with one of the configured student roles (can be empty)
 * @throws {GuildUnavailableError} if the guild is unavailable
 * @throws {RolesNotAssigned} if the student role was not set
 */
async function getStudents(guild) {
	if (!guild.available) {
		throw new GuildUnavailableError("Can't get the list of students, because the guild is unavailable");
	}
	const db = await dbManager.db();
	const configsCollection = db.collection("configs");
	const studentRolesObj = await configsCollection.findOne({ _id: guild.id }, { projection: { _id: 0, studentRoles: 1 } });
	if (!Array.isArray(studentRolesObj?.studentRoles) || studentRolesObj.studentRoles.length === 0) {
		throw new RolesNotAssigned("The student role was not configured.");
	}
	let students = guild.roles.cache.get(studentRolesObj.studentRoles[0])?.members;
	for (let i = 1; i < studentRolesObj.studentRoles.length; ++i) {
		const roleMembers = guild.roles.cache.get(studentRolesObj.studentRoles[i])?.members;
		if (roleMembers === undefined) {
			continue;
		}
		if (students) {
			students = students?.concat(roleMembers);
		} else {
			students = roleMembers;
		}
	}
	return students?.array() || [];
}

/**
 * Tests if a channel is accessible only by users with teacher role.
 *
 * Before responding to some commands it should be checked whether the channel is "protected" from unauthorised users.
 * @param {Discord.TextChannel | Discord.DMChannel | Discord.NewsChannel} channel The channel to test
 * @throws {RolesNotAssigned} if the teacher role was not set
 */
async function isTeacherOnlyChannel(channel) {
	if (!(channel instanceof Discord.TextChannel)) {
		return false;
	}
	const db = await dbManager.db();
	const configsCollection = db.collection("configs");
	const teacherRolesObj = await configsCollection.findOne({ _id: channel.guild.id }, { projection: { _id: 0, teacherRoles: 1 } });
	if (!Array.isArray(teacherRolesObj?.teacherRoles) || teacherRolesObj.teacherRoles.length === 0) {
		throw new RolesNotAssigned("The teacher role was not configured.");
	}
	// All users have at least one role recognised as a teacher role
	return channel.members.every(user => {
		return user.roles.cache.some(role => {
			return teacherRolesObj.teacherRoles.contains(role.id);
		});
	});
}

/**
 * Adds a role to the set of teacher roles for the current guild.
 * @param {Discord.Snowflake} guildId The id of the guild
 * @param {Discord.Snowflake} roleId The role which should be recognised as a teacher role
 */
async function addTeacherRole(guildId, roleId) {
	const db = await dbManager.db();
	const configsCollection = db.collection("configs");
	await configsCollection.updateOne({ _id: guildId }, { $addToSet: { teacherRoles: roleId } });
}

/**
 * Adds a role to the set of teacher roles for the current guild.
 * @param {Discord.Snowflake} guildId The id of the guild
 * @param {Discord.Snowflake} roleId The role which should be recognised as a teacher role
 */
async function addStudentRole(guildId, roleId) {
	const db = await dbManager.db();
	const configsCollection = db.collection("configs");
	await configsCollection.updateOne({ _id: guildId }, { $addToSet: { studentRoles: roleId } });
}

/**
 * Checks if a member has administrator permissions.
 * @param {Discord.GuildMember?} [member] Member whose permissions are checked
 */
function isAdmin(member) {
	return member?.hasPermission("ADMINISTRATOR") === true;
}

module.exports = { isTeacher, isStudent, getStudents, isTeacherOnlyChannel, addTeacherRole, addStudentRole, isAdmin };
