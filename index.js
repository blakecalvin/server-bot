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
						out = "**Mods**/n```";
						break;
					case "worlds":
						out = "**Worlds**/n```";
						break;
					case "users":
						out = "**Users**/n```";
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
							out = "[Error] \'"+content[1]+" "+content[2]+"\' requires name.\nUse `"+BOT+"> help` for usage.";
						}
						break;
					default:
						out = "[Error] target `"+content[2]+"` not recognized.\nUse `"+BOT+"> help` for usage.";
						break;	
				}
				break;
			case 'start':
				var status = start(config, msg);

				if (status){
					out = `[Success] Server started.`;
				}
				else{
					out = `[Error] encountered error starting server.`;
				}
				break;
			case 'status':
				out = "**Status**\n```" + Discord.escapeMarkdown(status(config), true) + "```";
				break;
			case 'stop':

				var status = stop(msg);

				if (status){
					out = `[Error] encountered error stopping server.`;
				}
				else{
					out = `[Success] Server stopped.`;
				}
				break;
			default:
				out = "[Error] command `"+content[1]+"` not recognized.\nUse `"+BOT+"> help` for usage.";
				break;
		}
		msg.channel.send(out);
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
	│         ├─ modpacks: show modpack for each version
	│         ├─ worlds  : show current and available worlds
	│         └─ users   : show server members
	├─ set [target]
	│         └─ world [name]: set current world (under maintenance)
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
		
			out = "Current World: " + current + "\nVersion: " + version + "\n\nAll Worlds:";

			var list = getWorldList(config.bot.serverPath);
			console.log("list: " + list.toString());
			console.log("keys: " + Object.keys(list).toString());

			var keys = Object.keys(list);
			keys.forEach( element => {
				if (element != " " && list[element]){
					out = out + "\n" + list[element];
					list[element].forEach( element2 => {
						out = out + "\n    - " + element2;
					});
				}
			});
			break;
		case "users":
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
			var worldInfo = getCurrentWorld(config.bot.serverPath);
			var current = worldInfo.world;

			var worlds = getWorldList(config.bot.serverPath);

			console.log(current+" == "+content[3]);
			console.log(current == content[3]);

			if (current == content[3]){
				out = "[Error] current world already set to `" + content[3] + "`." ;
			}
			else if (!checkWorldList(worlds, content[3])){
				out = "[Error] `"+content[3]+"` not in `maps` directory.";
			}
			else {
				setWorld(config.bot.serverPath, content[3]);
				out = "World set to `" + content[3] + "`\nStart/restart server to play.";
			}
			break;
		default:
			break;	
	}	
	return out;
}

function start(config, msg){
	var status = getServerStatus("minecraft");
	if (status){
		msg.channel.send(`[Error] Server already running.`);
		break;
	}
	var worldInfo = getCurrentWorld(config.bot.serverPath);
	var version = worldInfo.version; 
	execSync(`bash ./scripts/start_server.sh ${config.bot.serverPath} ${version}`);

	setTimeout(function(){
		msg.channel.send(`[Info] Starting server, please wait...`);
	}, 3000);
	status = getServerStatus("minecraft");

	return status;
}

function status(config){

	var is_online = getServerStatus("minecraft");
	var status = (is_online) ? emoji.online : emoji.offline;

	var ip = config.bot.serverIP;
	 
	var worldInfo = getCurrentWorld(config.bot.serverPath);
	var version = worldInfo.version;
	var currentWorld = worldInfo.world;
	currentWorld = currentWorld.replace(/(\r\n|\n|\r)/gm, "");

	out = "Server : "+status+"\nIPv4 : "+ip+"\nWorld : "+currentWorld+"\nVersion : "+version+"\n\nOnline :"+list("users", config);
	return out;
}

function stop(msg){
	var status = getServerStatus("minecraft");
	if (status){
		msg.channel.send(`[Error] No server running.`);
		break;
	}
	execSync(`bash ./scripts/stop_server.sh`);

	setTimeout(function(){
		msg.channel.send(`[Info] Stopping server, please wait...`);
	}, 3000);
	status = getServerStatus("minecraft");
	
	return status;
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

	setTimeout(function(){
		execSync(`screen -S minecraft -p 0 -X stuff \"list^M\"`);
	}, 50);

	var members = execSync(`tail -n 1 ${serverPath}/logs/latest.log`).toString();

	members = members.split(':');
	members = members[4];
	if (members.length > 3){
		members = members.split(',');
		console.log(members);
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
				status = execSync(`screen -ls | grep minecraft`).toString();
				console.log(status);
				return true;
			}
			catch(error){
				console.error(error);
				return false;
			}
			break;
		default:
			return false;
			break;
	}
}

function getWorldList(serverPath){
	var output = execSync(`ls ${serverPath}/maps/`).toString();
	var versions = null;
	var worlds = null;
	if (output){
		output = output.split("\n");
		output = output.splice(output.length-1,1);
		console.log(output);
		output.forEach( element => {
			if (element != ''){
				element = element.replace(/(\r\n|\n|\r)/gm, "");	
			}
		});
		versions = output;
		worlds = {};
		versions.forEach( element => {
			worlds[element] = [];
			output = execSync(`ls ${serverPath}/maps/${element}`).toString();
			if (output){
				output = output.split("\n");
				output = output.splice(output.length-1,1);
				console.log(output);
				output.forEach( element2 => {
					if (element2 != ''){
						element2 = element2.replace(/(\r\n|\n|\r)/gm, "");	
					}
				});
				worlds[element] = output;
			}
		})
	}
	return worlds;
}

function getVersion(list, name){
	var keys = Object.keys(list);
	keys.forEach( element => {
		if (element != " " && list[element]){
			list[element].forEach( element2 => {
				if (element2 == name){
					return element;
				}
			});
		}
	});
	return false;
}

// -----------------[ SETTERS ]----------------------------------------------------------------------------------------------------

function setWorld(serverPath, name){
	var list = getWorldList(serverPath);
	var version = getVersion(list, name);
	execSync(`sed "s|level-name=maps/.*|level-name=maps/${version}/${name}|g" ${serverPath}/server.properties`);
}

// -----------------[ UTILS ]------------------------------------------------------------------------------------------------------

function checkWorldList(list, name){
	var keys = Object.keys(list);
	keys.forEach( element => {
		if (element != " " && list[element]){
			list[element].forEach( element2 => {
				if (element2 == name){
					return true;
				}
			});
		}
	});
	return false;
}