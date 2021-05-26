class MessageEventWrapper {
	constructor(bot, event) {
		this._bot = bot;
		this._forceDM = false;
		this.original = event;
	}

	get id() {
		return this.original.id;
	}

	get author() {
		return this.original.author;
	}

	get channel() {
		return this.original.channel;
	}

	get guild() {
		return this.original.guild;
	}

	get content() {
		return this.original.content;
	}

	get guild() {
		return this.original.guild;
	}

	delete() {
		return this.original.delete();
	}

	reply(message) {
		if (this._forceDM) return this.replyDM(message);

		if (typeof(message) === 'string') {
			this.original.channel.send('<@' + this.author.id + '> ' + message);
		} else {
			this.original.channel.send(message.message, {
				embed: message.embed,
			});
		}
	}

	replyDM(message) {
		if (this.original.channel.type !== 'dm') this.delete();

		if (typeof(message) === 'string') {
			this.original.author.send(message);
		} else {
			this.original.author.send(message.message, {
				embed: message.embed,
			});
		}
	}
}

module.exports = MessageEventWrapper;
