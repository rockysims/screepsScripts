/// <reference path="../../typings/index.d.ts" />

import Log from 'util/Log';
import getAll from 'getAll';
import SpawnRequest from 'SpawnRequest';
import HarvesterLogic from 'roles/HarvesterLogic';
import BuilderLogic from 'roles/BuilderLogic';
import MinerLogic from 'roles/MinerLogic';
//import carrierLogic from 'roles/CarrierLogic';
//import upgraderLogic from 'roles/UpgraderLogic';
//import repairerLogic from 'roles/RepairerLogic';

//TODO: add 'gulp sim:watch'

export const loop = function(): void {
	if (Game.time % 5 == 0) {
		Log.log(Game.time + ' -----------------');
	}

	Object.keys(Memory.creeps).forEach((name) => {
		if (!Game.creeps[name]) {
			console.log('Clearing non-existing creep memory: ' + name + ' (' + Memory.creeps[name].role + ')');
			delete Memory.creeps[name];
		}
	});

	Object.keys(Memory.rooms).forEach((name) => {
		if (!Game.rooms[name]) {
			console.log('Clearing non-existing room memory: ' + name);
			delete Memory.rooms[name];
		}
	});

	let all = getAll();

	HarvesterLogic.onTick();
	BuilderLogic.onTick();
	MinerLogic.onTick();
	//CarrierLogic.onTick();
	//UpgraderLogic.onTick();
	//RepairerLogic.onTick();

	//tick multi room creeps
	//all.creeps.forEach((creep: Creep) => {
	//	let role = creep.memory.role;
	//	if (role == 'a') aLogic.run(creep);
	//	else if (role == 'b') bLogic.run(creep);
	//	else if (role == 'c') cLogic.run(creep);
	//	else Log.warn('Unknown role: ' + role);
	//});

	//tick rooms
	all.rooms.forEach((room: Room) => {
		let creeps = all.creeps.filter((creep: Creep) => creep.room.name == room.name);

		//tick single room creeps
		creeps.forEach((creep: Creep) => {
			let role = creep.memory.role;
			if (role == 'harvester') HarvesterLogic.run(creep);
			else if (role == 'builder') BuilderLogic.run(creep);
			else if (role == 'miner') MinerLogic.run(creep);
			//else if (role == 'carrier') CarrierLogic.run(creep);
			//else if (role == 'upgrader') UpgraderLogic.run(creep);
			//else if (role == 'repairer') RepairerLogic.run(creep);
		});

		//fill spawnRequests[]
		let spawnRequests: SpawnRequest[] = [];
		spawnRequests.push(HarvesterLogic.generateSpawnRequest(room));
		spawnRequests.push(BuilderLogic.generateSpawnRequest(room));
		spawnRequests.push(MinerLogic.generateSpawnRequest(room));
		//spawnRequests.push(CarrierLogic.generateSpawnRequest(room));
		//spawnRequests.push(UpgraderLogic.generateSpawnRequest(room));
		//spawnRequests.push(RepairerLogic.generateSpawnRequest(room));

		let spawnRequest: SpawnRequest | undefined = spawnRequests
			.filter(sr => sr.priority > 0) //0 priority means ignore
			.sort((a, b) => a.priority - b.priority) //lowest to highest
			.pop();

		let spawn: StructureSpawn | undefined = all.spawns
			.filter((spawn: StructureSpawn) => spawn.room.name == room.name && !spawn.spawning)
			.sort((a: Spawn, b: StructureSpawn) => a.energy - b.energy) //lowest to highest
			.pop();

		//try to use spawn to execute spawnRequest
		if (spawn && spawnRequest) {
			let body: string[] = spawnRequest.generateBody(room.energyCapacityAvailable);
			let memory: {role: string} = spawnRequest.memory;
			spawn.createCreep(body, undefined, memory);
		}
	});


	//tick towers
	//TODO: write







	//builder mechanics
	//	if (construction sites > builders)
	//		request builder spawn (no builders = high, lots = low priority)
	//	foreach builder
	//		if (full of energy) go repair
	//		else collect energy from closest container || source

	//miner mechanics
	//	if (any source isn't being mined out && has tile for another miner)
	//		build container
	//		if (container already built)
	//			request miner spawn (no miners = high, lots = lowish priority)

	//carrier mechanics
	//	if (any input container > 25% full)
	//		collect energy from closest container
	//		deliver to closest spawn/extension || output container < 100% full
	//	if (any input container > 75% full && any output container < 75% full)
	//		request spawn carrier (priority based on % of input containers > 75% full)

	//upgrader mechanics
	//	upgrade room ctrl by collecting energy from closest container || source

	//repairer mechanics
	//	if (any structure hits < 75% full)
	//		send repairer
	//	if (any structure hits < 50% full)
	//		request spawn repairer (priority based on lowest structure's % of full hits)

	//harvester mechanics
	//	foreach harvest
	//		collect energy from closest container || source
	//	let basicTrioOk =
	//		   (miners > 0 || no spawn requests for miners)
	//		&& (carriers > 0 || no spawn requests for carriers)
	//		&& (builders > 0 || no spawn requests for builder)
	//	if (harvester count < 2 && !basicTrioOk)
	//		request spawn harvester (priority 8)

	//spawn mechanics
	//	sort spawn requests for highest priority
	//	wait for enough energy then spawn
};











//TODO: move to it's own file?
//class Mem {
//	static onTick() {
//		Memory['byId'] = Memory['byId'] || {};
//		Object.keys(Memory['byId']).forEach((id: string) => {
//			if (!Game.getObjectById(id)) {
//				console.log("Clearing non-existing memory['byId']: " + id);
//				delete Memory['byId'][id];
//			}
//		});
//	}
//
//	static byId(id: string): {} {
//		Memory['byId'] = Memory['byId'] || {};
//		return Memory['byId'][id];
//	}
//}
