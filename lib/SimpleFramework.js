const DiscordClient = require('discord.io').Client;
const ArgumentParser = require('./util/ArgumentParser');
const Command = require('./Command');
const MessageEventWrapper = require('./MessageEventWrapper');

class SimpleFramework extends DiscordClient {
	constructor(opts = {}) {
		super(opts);

		this.prefixes = opts.prefixes || [];

		this.logCommands = !!opts.logCommands;

		this.commandHandler = new Command(this, {
			generalHandler: true,
			channelCooldown: opts.channelCooldown,
			userCooldown: opts.userCooldown,
			handler: opts.defaultHandler
		});

		this._registerListeners();
	}

	_registerListeners() {
		this.on('ready', () => this._onReady());
		this.on('disconnect', () => this._onDisconnect());
		this.on('any', rawEvent => rawEvent.t === 'MESSAGE_CREATE' && this._onMessage(rawEvent.d));
	}

	_onReady() {
		for (var i = 0; i < this.prefixes.length; i++) if (this.prefixes[i].indexOf('#BOT_MENTION#') !== -1) {
			this.prefixes[i] = this.prefixes[i].replace(/#BOT_MENTION#/g, '<@' + this.id + '>');
		}
	}

	_onDisconnect() {
		this.connect();
	}

	_onMessage(event) {
		var message = event.content;

		var prefixFound = false;

		for (var prefix of this.prefixes) if (message.indexOf(prefix) === 0) {
			prefixFound = true;
			message = message.substr(prefix.length);

			break;
		}

		if (!prefixFound) return;

		var args = null;

		try {
			args = ArgumentParser.parse(message, {returns: 'tokens'});
		} catch (ex) {
			return this.sendMessage({
				to: userID,
				message: ex.message
			});
		}

		if (this.logCommands) console.log(`${event.author.username} (${event.author.id}): ${message}`);

		this.commandHandler.handle(new MessageEventWrapper(this, event), message, args);
	}

	addCommand(name, opts) {
		return this.commandHandler.addSubcommand(name, opts);
	}
}

SimpleFramework.Command = Command;

module.exports = SimpleFramework;
