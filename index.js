const { exec } = require('child_process');
const execSync =  require('child_process').execSync;
const fs = require("fs");
const Discord = require("discord.js");

let client = new Discord.Client();
config = JSON.parse(fs.readFileSync("config.json", "utf8"));
client.config = config.discord;

const BOT = config.bot.botName;
var current_world = '';

const options = {
	split: {
		char: "\n",
		prepend: "```",
		append: "```"
	}
}

const emoji = {
	online: "🟢",
	offline: "🔴"
}

client.on("message", msg => {
	var content = msg.content.split(' ')
	// Check for command trigger
	if (content[0] === `${BOT}>`){
		var out = '';
		switch (content[1]) {
			case 'help':
				out = "**Usage:**\n```" + Discord.escapeMarkdown(help(), true) + "```";
				break;
			case 'backup':
				backup(config.bot.serverPath);
				out = `[Info] Made backup of current world.`;
				break;
			case 'info':
				out = "**Server Info:**\n```" + Discord.escapeMarkdown(info(config), true) + "```";
				break;
			case 'list':
				var valid = true;
				switch (content[2]) {
					case "mods":
						out = "**Mods**\n";
						break;
					case "worlds":
						out = "**Worlds**\n```";
						break;
					case "users":
						out = "**Users**\n```";
						break;
					default:
						valid = false;
				}
				if (valid){
					out = out + Discord.escapeMarkdown(list(config, content[2]), true) + "```";
				}
				else{
					out = "[Error] target `"+content[2]+"` not recognized.\nUse `"+BOT+"> help` for usage.";
				}
				break;
			case 'set':
				switch (content[2]) {
					case "world":
						if (content[3]){
							out = set(config, content[2], content[3]);
						}
						else{
							out = "[Error] `"+content[1]+" "+content[2]+"` requires name.\nUse `"+BOT+"> help` for usage.";
						}
						break;
					default:
						out = "[Error] target `"+content[2]+"` not recognized.\nUse `"+BOT+"> help` for usage.";
						break;	
				}
				break;
			case 'start':
				var serverStatus = getServerStatus("minecraft");
				if (serverStatus){
					out = `[Error] Server already running.`;
				}
				else {
					start(config, msg);		
					setTimeout(() => { 
						serverStatus = getServerStatus("minecraft");
						if (serverStatus){
							out = `[Success] Server started.`;
						}
						else {
							out = `[Error] encountered error starting server.`;
						}
					}, 1000);
				}
				break;
			case 'status':
				out = "**Status**\n```" + Discord.escapeMarkdown(status(config), true) + "```";
				break;
			case 'stop':
				var serverStatus = getServerStatus("minecraft");
				if (!serverStatus){
					out = `[Error] No server running.`;
				}
				else {
					stop(msg);
					setTimeout(() => { 
						serverStatus = getServerStatus("minecraft");
						if (serverStatus){
							out = `[Error] encountered error stopping server.`;
						}
						else if (serverStatus != null){
							out = `[Success] Server stopped.`;
						}
					}, 1000);
				}
				break;
			default:
				out = "[Error] command `"+content[1]+"` not recognized.\nUse `"+BOT+"> help` for usage.";
				break;
		}
		setTimeout(() => {
			msg.channel.send(out);
		}, 1500);
	}
});

client.on("ready", () => console.log(`Logged in as ${client.user.tag}`));

client.login(client.config.token);

// -----------------[ COMMANDS ]---------------------------------------------------------------------------------------------------

function  backup(serverPath){
	var output = getCurrentWorld(serverPath);
	var version = output.version;
	var name = output.world;
	execSync(`bash ./scripts/backup.sh ${config.bot.serverPath} ${version} ${name}`);
}

function help(){
	const cmds = `${BOT}> [command]
	├─ help    : usage/command list
	├─ backup  : make backup of current world.
	├─ info    : show server info (IPv4, MC world/version)
	├─ list [target]
	│         ├─ mods: show modpack for each version
	│         ├─ worlds  : show current and available worlds
	│         └─ users   : show server members
	├─ set [target]
	│         └─ world [name]: set current world
	├─ start   : start server
	├─ status  : show server status, IP address, 
	│ 			     current world and online members
	└─ stop    : stop server`;
	return cmds;
}

function info(config){
	var worldInfo = getCurrentWorld(config.bot.serverPath);
	var version = worldInfo.version;
	var world = worldInfo.world;
	world = world.replace(/(\r\n|\n|\r)/gm, "");
	var info = "IPv4 : "+config.bot.serverIP+"\nWorld : "+world+"\nVersion : "+version;
	return info;
}

function list(config, target){
	var out = "";
	switch (target) {
		case "mods":
			out = "Download Here:\n" + config.bot.modsURL;
			break;
		case "worlds":
			var worldInfo = getCurrentWorld(config.bot.serverPath);
			var version = worldInfo.version;
			var current = worldInfo.world;
			current = current.replace(/(\r\n|\n|\r)/gm, "");
		
			out = "Current World : " + current + "\nVersion : " + version + "\n\n- All Worlds : -------";

			var list = getWorldList(config.bot.serverPath);

			var header = "\nName:".padding(15) + "Version:";
			out = out + header;

			var keys = Object.keys(list);
			keys.forEach( element => {
				if (element != " " && list[element]){ 
					out = out + "\n" + list[element].name.padding(15) + list[element].version; 
				}
			});
			break;
		case "users":

			var is_online = getServerStatus("minecraft");
			if (is_online){
				return "[Error] No server running.";
			}	

			var members = getMembers(config.bot.serverPath);
			if (members != null){
				members.forEach( element => {
					out = out + "\n  " + emoji.online + " : " + element;
				});
			}
			else {
				out = "None. You's alone ☹️"
			}
			break;
		default:
			break;
	}
	return out;
}

function set(config, target, name){

	var out = "";
	name = name || null;

	switch (target) {
		case "world":

			var is_online = getServerStatus("minecraft");
			if (is_online){
				return "[Error] Server must be stopped before changing map.";
			}

			var worldInfo = getCurrentWorld(config.bot.serverPath);
			var current = worldInfo.world;

			var worlds = getWorldList(config.bot.serverPath);

			if (current == name){
				out = "[Error] current world already set to `" + name + "`." ;
			}
			else if (!checkWorldList(worlds, name)){
				out = "[Error] `"+name+"` not in `maps` directory.";
			}
			else {
				setWorld(config.bot.serverPath, name);
				out = "World set to `" + name + "`\nStart/restart server to play.";
			}
			break;
		default:
			break;	
	}	
	return out;
}

function start(config, msg){
	var worldInfo = getCurrentWorld(config.bot.serverPath);
	var version = worldInfo.version; 
	var output = execSync(`bash ./scripts/start_server.sh ${config.bot.serverPath} ${version}`).toString();
	console.log(output);
	msg.channel.send(`[Info] Starting server, please wait...`);
}

function status(config){

	var is_online = getServerStatus("minecraft");
	var serverStatus = (is_online) ? emoji.online : emoji.offline;

	var ip = config.bot.serverIP;
	 
	var worldInfo = getCurrentWorld(config.bot.serverPath);
	var version = worldInfo.version;
	var currentWorld = worldInfo.world;
	currentWorld = currentWorld.replace(/(\r\n|\n|\r)/gm, "");

	out = "Server : "+serverStatus+"\nIPv4 : "+ip+"\nWorld : "+currentWorld+"\nVersion : "+version;
	if (serverStatus){
		out = out + "\n\nOnline :\n" + list(config, "users")
	}
	return out;
}

function stop(msg){
	execSync(`bash ./scripts/stop_server.sh`);
	msg.channel.send(`[Info] Stopping server, please wait...`);
}

// -----------------[ GETTERS ]----------------------------------------------------------------------------------------------------

function getCurrentWorld(serverPath){
	var current = execSync(`cat ${serverPath}/server.properties | grep level-name | awk \'{split($0,a,\"/\"); print a[2] \" \" a[3]}\'`).toString();
	current = current.split(" ");
	current.forEach( element => {
		element = element.replace(/(\r\n|\n|\r)/gm, "");
	});
	return {
		version: current[0],
		world: current[1]
	};
}

function getMembers(serverPath){

	execSync(`screen -S minecraft -p 0 -X stuff \"list^M\"`);

	var members = execSync(`tail -n 1 ${serverPath}/logs/latest.log`).toString();

	members = members.split(':');
	if (members.length == 5){
		members = members[4];
		if (members.length > 3){
			members = members.split(',');
		}
		else {
			members = null;
		}
	}
	else{
		members = null;
	}

	return members;
}

function getServerStatus(name){
	switch (name) {
		case "minecraft":
			try {
				var output = execSync(`screen -ls | grep minecraft`).toString();
				return true;
			}
			catch(error){
				return false;
			}
			break;
		default:
			return false;
			break;
	}
}

function getWorldList(serverPath){
	var output = execSync(`ls ${serverPath}/maps`).toString();
	var versions = null;
	var worlds = null;

	if (output){

		output = output.split("\n");
		output.pop();

		output.forEach( element => {
			if (element != ''){
				element = element.replace(/(\r\n|\n|\r)/gm, "");	
			}
		});

		versions = output;
		worlds = {};

		versions.forEach( element => {
			if (element != ' '){

				output = execSync(`ls ${serverPath}/maps/${element}`).toString();

				if (output){

					output = output.split("\n");
					output.pop();

					output.forEach( element2 => {
						if (element2 != ' '){
							element2 = element2.replace(/(\r\n|\n|\r)/gm, "");	
							worlds[element2] = {
								name : element2,
								version : element
							};
						}
					});
				}
			}
		})
	}
	console.log("worlds: "+JSON.stringify(worlds, null, 4));
	return worlds;
}

function getVersion(list, name){
	return list[name].version;
}

// -----------------[ SETTERS ]----------------------------------------------------------------------------------------------------

function setWorld(serverPath, name){
	var list = getWorldList(serverPath);
	var version = getVersion(list, name);
	console.log("version: "+version);
	console.log("before: " + execSync(`cat ${serverPath}/server.properties | grep level-name`).toString());
	execSync(`sed -i "s/level-name=maps\\/.*/level-name=maps\\/${version}\\/${name}/" ${serverPath}/server.properties`);
	console.log("after: " + execSync(`cat ${serverPath}/server.properties | grep level-name`).toString());
}

// -----------------[ UTILS ]------------------------------------------------------------------------------------------------------

function checkWorldList(list, name){
	if (list[name] != null){
		return true;
	}
	return false;
}

String.prototype.padding = function(n, c)
{
        var val = this.valueOf();
        if ( Math.abs(n) <= val.length ) {
                return val;
        }
        var m = Math.max((Math.abs(n) - this.length) || 0, 0);
        var pad = Array(m + 1).join(String(c || ' ').charAt(0));
        return (n < 0) ? pad + val : val + pad;
};