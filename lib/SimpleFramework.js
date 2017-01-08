const Discordjs = require('discord.js');
const DiscordClient = Discordjs.Client;
const ArgumentParser = require('./util/ArgumentParser');
const Command = require('./Command');
const MessageEventWrapper = require('./MessageEventWrapper');
const pkg = require('../package.json');
const APIRequestManager = require('./APIRequestManager');
const url = require('url');

class SimpleFramework extends DiscordClient {
	constructor(opts = {}) {
		super({
			shardId: (opts.discord.shard || [0, 1])[0],
			shardCount: (opts.discord.shard || [0, 1])[1]
		});

		this.prefixes = opts.prefixes || [];

		this.logCommands = !!opts.logCommands;

		this.commandHandler = new Command(this, {
			generalHandler: true,
			channelCooldown: opts.channelCooldown,
			userCooldown: opts.userCooldown,
			handler: opts.defaultHandler
		});

		this._registerListeners();

		this.login(opts.discord.token);
	}

	_registerListeners() {
		this.on('ready', () => this._onReady());
		this.on('raw', rawEvent => rawEvent.t === 'MESSAGE_CREATE' && this._onMessage(rawEvent.d));
	}

	_onReady() {
		for (var i = 0; i < this.prefixes.length; i++) if (this.prefixes[i].indexOf('#BOT_MENTION#') !== -1) {
			this.prefixes[i] = this.prefixes[i].replace(/#BOT_MENTION#/g, '<@' + this.id + '>');
		}
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

		if (this.logCommands && args.length > 0 && this.commandHandler.subcommands[args[0].value.toLowerCase()]) console.log(`${event.author.username} (${event.author.id}): ${message}`);

		this.commandHandler.handle(new MessageEventWrapper(this, event), message, args);
	}

	addCommand(name, opts) {
		return this.commandHandler.addSubcommand(name, opts);
	}
}

SimpleFramework.Command = Command;

module.exports = SimpleFramework;
