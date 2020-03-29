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
	var out = '';
	// Check for command trigger
	if (content[0] === `${BOT}>`){
		var cmd = content[1]
		switch (content[1]) {
			case 'help':
				/*
				< SERVER-BOT >
				USAGE:
				bot> [command]
						├─ help		: usage/command list
						├─ info		: show server info (Name, ID, IPv4)
						├─ list [target]
						│			├─ worlds	: show current and available worlds
						│			└─ users	: show server members
						├─ set [target]
						│			└─ worlds	: set current world
						├─ start	: start server
						├─ status	: show server status, IP address, current world and online members
						└─ stop		: stop server
				*/
				const cmds = `${BOT}> [command]
			├─ help    : usage/command list
			├─ backup  : make backup of currents world.
			├─ info    : show server info (IPv4, MC world/version)
			├─ list [target]
			│         ├─ modpacks: show modpacks used (under maintenance)
			│         ├─ worlds  : show current and available worlds
			│         └─ users   : show server members (under maintenance)
			├─ set [target]
			│         └─ world [version] [name]: set current world (under maintenance)
			├─ start   : start server
			├─ status  : show server status, IP address, 
			│ 			     current world and online members
			└─ stop    : stop server`;
				const help = "**Usage:** ```\n" + Discord.escapeMarkdown(cmds, true) + "```";

				msg.channel.send(help, options);
				break;
			case 'backup':
				makeBackup(config.bot.serverPath);
				msg.channel.send(`[Info] Made backup of current world.`);
				break;
			case 'info':
				var worldInfo = getCurrentWorld(config.bot.serverPath);
				console.log(worldInfo.toString());
				var version = worldInfo.version;
				console.log(version);
				var world = worldInfo.world;
				world = world.replace(/(\r\n|\n|\r)/gm, "");
				console.log(world);
				var info = "**Server Info:**\n"+"```"+Discord.escapeMarkdown("IPv4 : "+config.bot.serverIP+"\nWorld : "+world+"\nVersion : "+version)+"```";
				msg.channel.send(info);
				break;
			case 'list':
				switch (content[2]) {
					case "worlds":
						var worldInfo = getCurrentWorld(config.bot.serverPath);
						var version = worldInfo.version;
						var current = worldInfo.world;
						current = world.replace(/(\r\n|\n|\r)/gm, "");
						console.log(`current: ${current}`);
						var worlds = `**Current World:** ${current}\n**Version:** ${version}\n\n**All Worlds:**`;
						var list = getWorldList(config.bot.serverPath);
						console.log(Object.keys(list))
						var keys = Object.keys(list);
						keys.forEach( element => {
							worlds = worlds + "\n" + list[element];
							list[element].forEach( element2 => {
								worlds = worlds + "\n\t-" + element2;
							})
						})
						msg.channel.send(worlds);
						break;
					case "users":
						msg.channel.send(`!! UNDER MAINTENANCE !!`);
						break;
					default:
						out = "[Error] target `"+content[2]+"` not recognized.\nUse `"+BOT+"> help` for usage.";
						msg.channel.send(out);
						break;
				}

				break;
			case 'set':
				/*
				switch (content[2]) {
					case "world":
						console.log(getCurrentWorld(config.bot.serverPath)+" == "+content[3]);
						console.log(getCurrentWorld(config.bot.serverPath) == content[3]);
						if (getCurrentWorld(config.bot.serverPath) == content[3]){
							
							out = "[Error] current world already set to `" + content[3] + "`" ;
						}
						else if (!getWorldList(config.bot.serverPath).includes(content[3])){
						
							out = "[Error] `"+content[3]+"` not in `maps` directory.";
						}
						else {
							res = setCurrentWorld(config.bot.serverPath, content[3]);
							if (!res){
								out = "World set to \'" + content[3] + "\'\nStart/restart server to play.";
							}
						}
						msg.channel.send(out);
						break;
					default:
						out = "[Error] target `"+content[2]+"` not recognized.\nUse `"+BOT+"> help` for usage.";
						msg.channel.send(out);
						break;	
				}
				*/
				break;
			case 'start':
				var worldInfo = getCurrentWorld(config.bot.serverPath);
				var version = worldInfo.version; 
				execSync(`bash ./scripts/start_server.sh ${config.bot.serverPath} ${version}`);
				status = gameServerStatus("minecraft");
				if (status){
					msg.channel.send(`[Info] Starting server, please wait...`);
					setTimeout(function(){
						msg.channel.send(`[Success] Server started.`);
					}, 3000);
				}
				else{
					msg.channel.send(`[Error] encountered error starting server.`);
				}
				break;
			case 'status':
				/*
				return server-bot status

				example:
				STATUS:
				server : 🟢
				IPv4 : 10.192.168.0
				world : map1
				version : 1.12.2
								               TODO: IP Geolocating 
														|
				online:									V
					> user1 	: 10.192.168.1 	: (Seattle, WA, USA)
					> user2 	: 10.192.168.2 	: (Seattle, WA, USA)
					> user3 	: 10.192.168.3 	: (Seattle, WA, USA) 
				*/

				var is_online = gameServerStatus("minecraft");
				var ip = config.bot.serverIP;
				var status = (is_online) ? emoji.online : emoji.offline; 

				var worldInfo = getCurrentWorld(config.bot.serverPath);
				var version = worldInfo.version;
				var currentWorld = worldInfo.world;
				currentWorld = world.replace(/(\r\n|\n|\r)/gm, "");

				out = "**Status:**\n```"+ Discord.escapeMarkdown("Server : "+status+"\nIPv4 : "+ip+"\nWorld : "+currentWorld+"\nVersion : "+version+"\nOnline : ");

				// output = getMembers(config);
				out = out + "```";

				msg.channel.send(out);
				break;
			case 'stop':
				exec(`bash ./scripts/stop_server.sh`, (err, stdout, stderr)  => {
					if (err) console.error(err);
					if (stdout) msg.channel.send("Stopping server...");
					else if (stderr) msg.channel.send(stderr);
				});
				break;
			default:
				out = "[Error] command `"+content[1]+"` not recognized.\nUse `"+BOT+"> help` for usage.";
				msg.channel.send(out);
				break;
		}
	}
});

client.on("ready", () => console.log(`Logged in as ${client.user.tag}`));

client.login(client.config.token);

// Todo: update to use forge to output active players using "list" command
function getMembers(config){
	var members = execSync(`screen -S sessionName -p 0 -X stuff \"list^M\"`).toString();
	console.log(members);
	return members;
}

function gameServerStatus(name){
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

// Todo: update
function setCurrentWorld(serverPath, name){
	var set = execSync(`sed "s|level-name=maps/.*|level-name=maps/${name}|g" ${serverPath}/server.properties`).toString();
	return set;
}

function getWorldList(serverPath){
	var output = execSync(`ls ${serverPath}/maps/`).toString();
	var versions = null;
	var worlds = null;
	if (output){
		output = output.split("\n");
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
	else {
		versions = [];
	}
	return worlds;
}

function  makeBackup(serverPath){
	var output = getCurrentWorld(serverPath);
	var version = output.version;
	var name = output.world;
	execSync(`cp -r ${serverPath}/maps/${version}/${name} ${serverPath}/backups/${version}/${name}$(date +.%m-%d-%Y_%H:%M)`);
}